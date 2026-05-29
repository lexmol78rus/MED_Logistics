import { Injectable } from '@nestjs/common';
import { normalizeScannedBarcode } from '../../common/barcode-normalize';
import { buildBarcodeWhere } from '../../common/barcode-lookup';
import { analyzeScannedBarcode, type BarcodeKind, type ScanParsedFields } from '../../common/scan-analyze';
import { normalizeGtin } from '../../common/gtin-normalize';
import { PrismaService } from '../../prisma/prisma.service';

export type ScannerProcessResult = {
  found: boolean;
  barcodeKind: BarcodeKind;
  parsed: ScanParsedFields;
  barcodeExpiryDate?: string;
  expiryWarning?: string;
  hints: string[];
  entityType?: 'product' | 'lot';
  product?: {
    id: string;
    name: string;
    ref: string;
    manufacturer: string | null;
    barcode: string;
  };
  lot?: {
    id: string;
    lotNumber: string;
    productId: string;
    productName: string;
    ref: string;
  };
};

@Injectable()
export class ScannerService {
  constructor(private readonly prisma: PrismaService) {}

  async process(barcode: string): Promise<ScannerProcessResult> {
    const analysis = analyzeScannedBarcode(barcode);
    const base: ScannerProcessResult = {
      found: false,
      barcodeKind: analysis.kind,
      parsed: analysis.parsed,
      barcodeExpiryDate: analysis.barcodeExpiryDate,
      expiryWarning: analysis.expiryWarning,
      hints: analysis.hints,
    };

    const candidates = normalizeScannedBarcode(barcode);
    if (candidates.length === 0) return base;

    const trimmed = candidates[0];
    const upper = trimmed.toUpperCase();

    if (this.looksLikeLot(upper)) {
      const lotResult = await this.findLot(upper);
      if (lotResult) return { ...base, ...lotResult, found: true };
    }

    const record = await this.prisma.barcodeRecord.findFirst({
      where: { OR: buildBarcodeWhere(candidates) },
      include: {
        product: true,
        lot: { include: { product: true } },
      },
    });

    const recordProduct = record?.product ?? record?.lot?.product;
    if (record && recordProduct && !this.isAutoBarcodeStub(recordProduct.sku, trimmed)) {
      return {
        ...base,
        found: true,
        entityType: record.lot ? 'lot' : 'product',
        product: {
          id: recordProduct.id,
          name: recordProduct.name,
          ref: recordProduct.sku,
          manufacturer: recordProduct.manufacturer,
          barcode: record.barcode,
        },
        ...(record.lot
          ? {
              lot: {
                id: record.lot.id,
                lotNumber: record.lot.lotNumber,
                productId: record.lot.productId,
                productName: recordProduct.name,
                ref: recordProduct.sku,
              },
            }
          : {}),
      };
    }

    const bySku = await this.prisma.product.findFirst({
      where: {
        OR: [
          { sku: { equals: upper, mode: 'insensitive' } },
          { sku: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      include: { barcodes: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (bySku) {
      return {
        ...base,
        found: true,
        entityType: 'product',
        product: {
          id: bySku.id,
          name: bySku.name,
          ref: bySku.sku,
          manufacturer: bySku.manufacturer,
          barcode: bySku.barcodes[0]?.barcode ?? trimmed,
        },
      };
    }

    const lotByNumber = await this.findLot(upper);
    if (lotByNumber) return { ...base, ...lotByNumber, found: true };

    const gtin = normalizeGtin(base.parsed.gtin);
    if (gtin) {
      const byGtin = await this.prisma.product.findUnique({
        where: { gtin },
        include: {
          barcodes: { take: 1, orderBy: { createdAt: 'asc' } },
        },
      });
      if (byGtin && !this.isAutoBarcodeStub(byGtin.sku, trimmed)) {
        return {
          ...base,
          found: true,
          entityType: 'product',
          product: {
            id: byGtin.id,
            name: byGtin.name,
            ref: byGtin.sku,
            manufacturer: byGtin.manufacturer,
            barcode: byGtin.barcodes[0]?.barcode ?? trimmed,
          },
        };
      }
    }

    if (!base.found && analysis.kind === 'gs1' && !analysis.parsed.lot) {
      base.hints = [
        ...base.hints,
        'Товар в базе не найден. Создайте карточку: REF укажите с этикетки (артикул производителя).',
      ];
    } else if (!base.found) {
      base.hints = [
        ...base.hints,
        'Товар в базе не найден — создайте карточку или проверьте штрих-код.',
      ];
    }

    return base;
  }

  private looksLikeLot(value: string): boolean {
    return /^LOT[-/]/i.test(value) || value.startsWith('LOT');
  }

  /** Карточка «BC-…» из быстрого создания без REF — не блокирует приёмку по настоящему REF. */
  private isAutoBarcodeStub(sku: string, scannedBarcode: string): boolean {
    const base = `BC-${scannedBarcode.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`.slice(0, 56);
    const normalized = sku.trim().toUpperCase();
    return normalized === base || normalized.startsWith(`${base}-`);
  }

  private async findLot(
    lotNumber: string,
  ): Promise<
    Omit<
      ScannerProcessResult,
      'barcodeKind' | 'parsed' | 'hints' | 'barcodeExpiryDate' | 'expiryWarning'
    > | null
  > {
    const lot = await this.prisma.lot.findFirst({
      where: {
        lotNumber: { equals: lotNumber, mode: 'insensitive' },
      },
      include: { product: { select: { id: true, sku: true, name: true } } },
    });
    if (!lot) return null;

    return {
      found: true,
      entityType: 'lot',
      lot: {
        id: lot.id,
        lotNumber: lot.lotNumber,
        productId: lot.productId,
        productName: lot.product.name,
        ref: lot.product.sku,
      },
      product: {
        id: lot.product.id,
        name: lot.product.name,
        ref: lot.product.sku,
        manufacturer: null,
        barcode: lotNumber,
      },
    };
  }
}
