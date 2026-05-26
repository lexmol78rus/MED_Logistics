/**
 * One-off / maintenance: remove all products (nomenclature) and related warehouse data.
 * Keeps: users, settings, write-off destinations, audit history (adds purge audit entry).
 *
 * Usage:
 *   node scripts/purge-nomenclature.mjs --dry-run
 *   node scripts/purge-nomenclature.mjs --confirm DELETE_ALL_PRODUCTS
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const EXPECTED = 'DELETE_ALL_PRODUCTS';

async function counts() {
  return {
    products: await prisma.product.count(),
    lots: await prisma.lot.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    movements: await prisma.stockMovement.count(),
    expectedReceipts: await prisma.expectedReceipt.count(),
    expectedReceiptEvents: await prisma.expectedReceiptEvent.count(),
    registrationCertificates: await prisma.productRegistrationCertificate.count(),
    barcodeRecords: await prisma.barcodeRecord.count(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const confirmIdx = args.indexOf('--confirm');
  const confirm = confirmIdx >= 0 ? args[confirmIdx + 1] : null;

  const before = await counts();
  console.log('Before:', JSON.stringify(before, null, 2));

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

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.stockMovement.updateMany({
      data: { correctedMovementId: null },
    });

    const barcodeDel = await tx.barcodeRecord.deleteMany({});
    const productDel = await tx.product.deleteMany({});

    await tx.auditLog.create({
      data: {
        action: 'product.purge_all',
        entityType: 'product',
        entityId: null,
        metadata: {
          source: 'scripts/purge-nomenclature.mjs',
          deleted: {
            products: productDel.count,
            barcodeRecords: barcodeDel.count,
          },
          before,
        },
      },
    });

    return {
      products: productDel.count,
      barcodeRecords: barcodeDel.count,
    };
  });

  const after = await counts();
  console.log('Deleted:', JSON.stringify(deleted, null, 2));
  console.log('After:', JSON.stringify(after, null, 2));
  console.log('Nomenclature purge complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
