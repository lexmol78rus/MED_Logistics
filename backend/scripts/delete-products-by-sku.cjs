/**
 * Remove specific products (by SKU) and related warehouse data.
 * Keeps users, settings, audit history (adds audit entry).
 *
 * Usage:
 *   node scripts/delete-products-by-sku.cjs --skus M7-025,M7-027 --dry-run
 *   node scripts/delete-products-by-sku.cjs --skus M7-025,M7-027 --confirm DELETE_PRODUCTS
 */
const { PrismaClient } = require('@prisma/client');
const { existsSync, unlinkSync, rmdirSync } = require('fs');
const { dirname } = require('path');

const prisma = new PrismaClient();
const EXPECTED = 'DELETE_PRODUCTS';

function parseSkus(argv) {
  const idx = argv.indexOf('--skus');
  if (idx < 0 || !argv[idx + 1]) {
    console.error('Pass --skus SKU1,SKU2,...');
    process.exit(1);
  }
  return argv[idx + 1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function relatedCounts(productIds) {
  if (productIds.length === 0) {
    return {
      products: 0,
      lots: 0,
      inventoryItems: 0,
      movements: 0,
      expectedReceipts: 0,
      expectedReceiptEvents: 0,
      registrationCertificates: 0,
      barcodeRecords: 0,
    };
  }
  const where = { productId: { in: productIds } };
  const movementIds = (
    await prisma.stockMovement.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const [lots, inventoryItems, movements, expectedReceipts, registrationCertificates, barcodeRecords] =
    await Promise.all([
      prisma.lot.count({ where }),
      prisma.inventoryItem.count({ where }),
      prisma.stockMovement.count({ where }),
      prisma.expectedReceipt.count({ where }),
      prisma.productRegistrationCertificate.count({ where }),
      prisma.barcodeRecord.count({ where }),
    ]);

  const expectedReceiptEvents =
    expectedReceipts > 0
      ? await prisma.expectedReceiptEvent.count({
          where: {
            expectedReceipt: { productId: { in: productIds } },
          },
        })
      : 0;

  return {
    products: productIds.length,
    lots,
    inventoryItems,
    movements,
    movementIds: movementIds.length,
    expectedReceipts,
    expectedReceiptEvents,
    registrationCertificates,
    barcodeRecords,
  };
}

function removeRuFiles(certificates) {
  const removed = [];
  for (const cert of certificates) {
    if (cert.storagePath && existsSync(cert.storagePath)) {
      try {
        unlinkSync(cert.storagePath);
        removed.push(cert.storagePath);
      } catch (err) {
        console.warn(`Could not unlink ${cert.storagePath}:`, err.message);
      }
    }
    const dir = dirname(cert.storagePath);
    try {
      rmdirSync(dir);
    } catch {
      /* dir not empty or missing */
    }
  }
  return removed;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skus = parseSkus(args);
  const confirmIdx = args.indexOf('--confirm');
  const confirm = confirmIdx >= 0 ? args[confirmIdx + 1] : null;

  const products = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true, name: true },
    orderBy: { sku: 'asc' },
  });

  const foundSkus = new Set(products.map((p) => p.sku));
  const missing = skus.filter((s) => !foundSkus.has(s));
  if (missing.length) {
    console.warn('SKUs not found (skipped):', missing.join(', '));
  }
  if (products.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const productIds = products.map((p) => p.id);
  const counts = await relatedCounts(productIds);

  const certs = await prisma.productRegistrationCertificate.findMany({
    where: { productId: { in: productIds } },
    select: { id: true, storagePath: true, productId: true },
  });

  console.log('Products to delete:');
  for (const p of products) {
    console.log(`  - ${p.sku}: ${p.name} (${p.id})`);
  }
  console.log('Related counts:', JSON.stringify(counts, null, 2));
  console.log(`RU files on disk: ${certs.length}`);

  if (dryRun) {
    console.log('Dry run — no changes made.');
    return;
  }

  if (confirm !== EXPECTED) {
    console.error(
      `Refusing to run. Pass --confirm ${EXPECTED} (or use --dry-run to preview).`,
    );
    process.exit(1);
  }

  const movementIds = (
    await prisma.stockMovement.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const deleted = await prisma.$transaction(async (tx) => {
    if (movementIds.length > 0) {
      await tx.stockMovement.updateMany({
        where: { correctedMovementId: { in: movementIds } },
        data: { correctedMovementId: null },
      });
    }

    const barcodeDel = await tx.barcodeRecord.deleteMany({
      where: { productId: { in: productIds } },
    });

    const productDel = await tx.product.deleteMany({
      where: { id: { in: productIds } },
    });

    await tx.auditLog.create({
      data: {
        action: 'product.delete_by_sku',
        entityType: 'product',
        entityId: null,
        metadata: {
          source: 'scripts/delete-products-by-sku.cjs',
          skus: products.map((p) => p.sku),
          productIds,
          deleted: {
            products: productDel.count,
            barcodeRecords: barcodeDel.count,
          },
          before: counts,
        },
      },
    });

    return {
      products: productDel.count,
      barcodeRecords: barcodeDel.count,
    };
  });

  const removedFiles = removeRuFiles(certs);

  const after = await relatedCounts(productIds);
  console.log('Deleted:', JSON.stringify(deleted, null, 2));
  console.log('RU files removed:', removedFiles.length);
  console.log('After (should be zeros):', JSON.stringify(after, null, 2));
  console.log('Done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
