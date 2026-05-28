import { fetchWriteoffRecommendation } from '../api/inventory';
import type { ShipmentWriteoffCartSeed } from '../api/shipments';
import { createWriteoffCartItemId, type WriteoffCartItem, type WriteoffCartLine } from '../../types/writeoff-cart';
import type { WriteoffRecommendation } from '../../types/api';
import { lotIsExpired } from '../writeoff/expiry';

export type BuildWriteoffCartFromShipmentParams = {
  seed: ShipmentWriteoffCartSeed;
  destinationId: string;
  destinationLabel: string;
  destinationComment?: string;
  operatorEmail: string;
  useFefoRecommendations?: boolean;
};

export type BuildWriteoffCartFromShipmentResult = {
  items: WriteoffCartItem[];
  skipped: Array<{ lineNo: number; name: string; reason: string }>;
};

function parseShipmentQty(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

/** Распределить целевое количество по партиям (FEFO-порядок из рекомендации). */
function allocateQtyAcrossLots(
  recommendation: WriteoffRecommendation,
  targetQty: number,
  useFefo: boolean,
): WriteoffCartLine[] {
  const lots = recommendation.lots;
  if (!lots.length || targetQty <= 0) return [];

  let remaining = targetQty;
  const lines: WriteoffCartLine[] = [];

  // Порядок партий уже задан API (FEFO при useFefoRecommendations).
  void useFefo;

  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lot.qty);
    if (take <= 0) continue;
    lines.push({
      lotId: lot.lotId,
      lotNumber: lot.lot,
      quantity: take,
      expiry: lot.expiry,
      expired: lotIsExpired(lot),
    });
    remaining -= take;
  }

  return lines;
}

export async function buildWriteoffCartFromShipment(
  params: BuildWriteoffCartFromShipmentParams,
): Promise<BuildWriteoffCartFromShipmentResult> {
  const useFefo = params.useFefoRecommendations !== false;
  const items: WriteoffCartItem[] = [];
  const skipped: BuildWriteoffCartFromShipmentResult['skipped'] = [];

  for (const line of params.seed.lines) {
    if (line.refLinkStatus === 'NO_REF') {
      skipped.push({ lineNo: line.lineNo, name: line.name, reason: 'нет REF' });
      continue;
    }
    if (line.refLinkStatus === 'NOT_FOUND' || !line.productId) {
      skipped.push({
        lineNo: line.lineNo,
        name: line.name,
        reason: `REF «${line.ref ?? '—'}» не найден в номенклатуре`,
      });
      continue;
    }

    const targetQty = parseShipmentQty(line.quantity);
    if (targetQty <= 0) {
      skipped.push({ lineNo: line.lineNo, name: line.name, reason: 'нулевое количество' });
      continue;
    }

    const recommendation = await fetchWriteoffRecommendation({
      productId: line.productId,
      useFefoRecommendations: useFefo,
    });

    const cartLines = allocateQtyAcrossLots(recommendation, targetQty, useFefo);
    const totalQty = cartLines.reduce((sum, l) => sum + l.quantity, 0);

    if (totalQty <= 0) {
      skipped.push({
        lineNo: line.lineNo,
        name: line.name,
        reason: 'нет доступного остатка на складе',
      });
      continue;
    }

    if (totalQty < targetQty) {
      skipped.push({
        lineNo: line.lineNo,
        name: line.name,
        reason: `на складе только ${totalQty} из ${targetQty} шт`,
      });
    }

    items.push({
      id: createWriteoffCartItemId(),
      productId: line.productId,
      productName: line.productName ?? recommendation.name,
      productRef: line.productRef ?? recommendation.ref,
      writeOffDestinationId: params.destinationId,
      destinationLabel: params.destinationLabel,
      writeOffComment: [
        params.destinationComment?.trim(),
        `поз. ${line.lineNo}`,
      ]
        .filter(Boolean)
        .join(' · '),
      useFefoRecommendations: useFefo,
      lines: cartLines,
      totalQty,
      operatorEmail: params.operatorEmail,
      createdAt: new Date().toISOString(),
      shipmentId: params.seed.shipmentId,
    });
  }

  return { items, skipped };
}
