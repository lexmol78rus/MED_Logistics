const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Warehouse123!';

const SEED_USERS = [
  { email: 'admin@med.local', role: UserRole.ADMIN },
  { email: 'manager@med.local', role: UserRole.MANAGER },
  { email: 'operator@med.local', role: UserRole.OPERATOR },
  { email: 'accountant@med.local', role: UserRole.ACCOUNTANT },
  { email: 'viewer@med.local', role: UserRole.VIEWER },
];

const SEED_PRODUCTS = [
  {
    sku: 'REF-8842',
    name: 'Маски хирургические L3',
    manufacturer: 'МедТех Плюс',
    barcode: '088421000',
    lots: [
      { lotNumber: 'ПАР-2023-A', expiryDate: '2027-04-12', qty: 5000, location: 'Зона A-12' },
      { lotNumber: 'ПАР-2023-B', expiryDate: '2028-01-10', qty: 10400, location: 'Зона B-04' },
    ],
  },
  {
    sku: 'REF-1102',
    name: 'Раствор натрия хлорида 500мл',
    manufacturer: 'ФармаКорп',
    barcode: '011021000',
    lots: [
      { lotNumber: 'ПАР-2023-A', expiryDate: '2026-06-01', qty: 400, location: 'Зона C-01' },
      { lotNumber: 'ПАР-2023-C', expiryDate: '2027-01-15', qty: 2000, location: 'Зона C-02' },
    ],
  },
  {
    sku: 'REF-9931',
    name: 'Перчатки латексные M',
    manufacturer: 'ГловМед',
    barcode: '099311000',
    lots: [
      { lotNumber: 'ПАР-2024-M', expiryDate: '2026-06-15', qty: 450, location: 'Зона A-05' },
    ],
  },
  {
    sku: 'REF-2234',
    name: 'Шприцы 5мл Луер-Лок',
    manufacturer: 'МедТех Плюс',
    barcode: '022341000',
    lots: [
      { lotNumber: 'ПАР-2024-S', expiryDate: '2028-01-20', qty: 8900, location: 'Зона D-01' },
    ],
  },
  {
    sku: 'REF-6632',
    name: 'Бинты марлевые 10см стерильные',
    manufacturer: 'ТекстильМед',
    barcode: '066321000',
    lots: [
      { lotNumber: 'ПАР-2025-B', expiryDate: '2026-05-25', qty: 120, location: 'Зона E-02' },
    ],
  },
  {
    sku: 'REF-4421',
    name: 'Обезболивающее в/в 100мг',
    manufacturer: 'ФармаКорп',
    barcode: '044211000',
    lots: [],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const { email, role } of SEED_USERS) {
    const active = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (active) {
      await prisma.user.update({
        where: { id: active.id },
        data: { role, isActive: true },
      });
    } else {
      await prisma.user.create({
        data: { email, passwordHash, role, isActive: true },
      });
    }
  }

  for (const item of SEED_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        manufacturer: item.manufacturer,
      },
      create: {
        sku: item.sku,
        name: item.name,
        manufacturer: item.manufacturer,
      },
    });

    await prisma.barcodeRecord.upsert({
      where: { barcode: item.barcode },
      update: { productId: product.id },
      create: { barcode: item.barcode, productId: product.id },
    });

    for (const lotSeed of item.lots) {
      const lot = await prisma.lot.upsert({
        where: {
          productId_lotNumber: {
            productId: product.id,
            lotNumber: lotSeed.lotNumber,
          },
        },
        update: {
          expiryDate: new Date(lotSeed.expiryDate),
        },
        create: {
          productId: product.id,
          lotNumber: lotSeed.lotNumber,
          expiryDate: new Date(lotSeed.expiryDate),
        },
      });

      const existing = await prisma.inventoryItem.findFirst({
        where: {
          productId: product.id,
          lotId: lot.id,
          location: lotSeed.location,
        },
      });

      if (existing) {
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: lotSeed.qty },
        });
      } else {
        await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            lotId: lot.id,
            quantity: lotSeed.qty,
            location: lotSeed.location,
          },
        });
      }
    }
  }

  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      payload: {
        warehouseName: 'МЕД-ЛОГИСТИКА — Склад №1',
        warehouseCode: 'WH-01',
        fefoEnabled: true,
        fefoStrict: true,
        expiryWarningDays: 90,
        expiryCriticalDays: 30,
        scannerAutoFocus: true,
        scannerDebounceMs: 400,
        scannerSoundEnabled: true,
        notificationEnabled: true,
        uiCompactMode: false,
        uiShowFefoHints: true,
      },
    },
    update: {},
  });

  await prisma.product.updateMany({
    data: { minStock: 50, reorderPoint: 100 },
  });

  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
