import { Injectable } from '@nestjs/common';
import { normalizeScannedBarcode } from '../../common/barcode-normalize';
import { buildBarcodeWhere } from '../../common/barcode-lookup';
import { PrismaService } from '../../prisma/prisma.service';

export type ScannerProcessResult = {
  found: boolean;
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
    const candidates = normalizeScannedBarcode(barcode);
    if (candidates.length === 0) return { found: false };

    const trimmed = candidates[0];
    const upper = trimmed.toUpperCase();

    if (this.looksLikeLot(upper)) {
      const lotResult = await this.findLot(upper);
      if (lotResult) return lotResult;
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
    if (lotByNumber) return lotByNumber;

    return { found: false };
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

  private async findLot(lotNumber: string): Promise<ScannerProcessResult | null> {
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
