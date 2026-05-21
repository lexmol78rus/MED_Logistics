import type { Prisma } from '@prisma/client';
import { normalizeScannedBarcode } from './barcode-normalize';

type BarcodeRecordSelect = {
  productId: string | null;
  lot: { productId: string } | null;
};

export function buildBarcodeWhere(candidates: string[]): Prisma.BarcodeRecordWhereInput[] {
  const clauses: Prisma.BarcodeRecordWhereInput[] = [];
  for (const c of candidates) {
    clauses.push({ barcode: c }, { barcode: { equals: c, mode: 'insensitive' } });
    if (/^\d{8,14}$/.test(c)) {
      clauses.push(
        { barcode: { endsWith: c, mode: 'insensitive' } },
        { barcode: { contains: c, mode: 'insensitive' } },
      );
    }
  }
  return clauses;
}

export async function resolveProductIdFromBarcode(
  findFirst: (args: {
    where: Prisma.BarcodeRecordWhereInput;
    select: { productId: true; lot: { select: { productId: true } } };
  }) => Promise<BarcodeRecordSelect | null>,
  raw: string,
): Promise<string | undefined> {
  const candidates = normalizeScannedBarcode(raw);
  if (candidates.length === 0) return undefined;

  const record = await findFirst({
    where: { OR: buildBarcodeWhere(candidates) },
    select: { productId: true, lot: { select: { productId: true } } },
  });

  return record?.productId ?? record?.lot?.productId ?? undefined;
}
