import { Injectable } from '@nestjs/common';
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
    const trimmed = barcode.trim();
    if (!trimmed) return { found: false };

    const upper = trimmed.toUpperCase();

    if (this.looksLikeLot(upper)) {
      const lotResult = await this.findLot(upper);
      if (lotResult) return lotResult;
    }

    const record = await this.prisma.barcodeRecord.findUnique({
      where: { barcode: trimmed },
      include: { product: true },
    });

    if (record?.product) {
      return {
        found: true,
        entityType: 'product',
        product: {
          id: record.product.id,
          name: record.product.name,
          ref: record.product.sku,
          manufacturer: record.product.manufacturer,
          barcode: record.barcode,
        },
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
