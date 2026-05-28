import {
  normalizeProductRef,
  resolveShipmentRefLinkStatus,
  type ShipmentRefLinkStatus,
} from '../../common/utils/product-ref.util';
import { decimalToNumber } from '../../common/utils/decimal.util';

type ShipmentItemRow = {
  id: string;
  shipmentId: string;
  productId: string | null;
  name: string;
  code: string | null;
  unit: string | null;
  vatRate: string | null;
  priceWithVat: { toString(): string } | null;
  quantity: { toString(): string };
  sum: { toString(): string } | null;
  contractLineNo: number | null;
  managerNote: string | null;
  managerTag: string | null;
  product?: { id: string; sku: string; name: string } | null;
};

export type ShipmentItemView = {
  id: string;
  shipmentId: string;
  name: string;
  code: string | null;
  unit: string | null;
  vatRate: string | null;
  priceWithVat: string | null;
  quantity: string;
  sum: string | null;
  contractLineNo: number | null;
  managerNote: string | null;
  managerTag: string | null;
  productId: string | null;
  productRef: string | null;
  productName: string | null;
  refLinkStatus: ShipmentRefLinkStatus;
};

export function presentShipmentItem(item: ShipmentItemRow): ShipmentItemView {
  const productId = item.productId ?? item.product?.id ?? null;
  const productRef = item.product?.sku ?? (item.code ? normalizeProductRef(item.code) : null);
  const productName = item.product?.name ?? null;

  return {
    id: item.id,
    shipmentId: item.shipmentId,
    name: item.name,
    code: item.code,
    unit: item.unit,
    vatRate: item.vatRate,
    priceWithVat: item.priceWithVat?.toString() ?? null,
    quantity: item.quantity.toString(),
    sum: item.sum?.toString() ?? null,
    contractLineNo: item.contractLineNo,
    managerNote: item.managerNote,
    managerTag: item.managerTag,
    productId,
    productRef: productId ? productRef : null,
    productName,
    refLinkStatus: resolveShipmentRefLinkStatus(item.code, productId),
  };
}

export function countRefLinkSummary(items: Array<{ refLinkStatus: ShipmentRefLinkStatus }>) {
  let linked = 0;
  let notFound = 0;
  let noRef = 0;
  for (const it of items) {
    if (it.refLinkStatus === 'LINKED') linked += 1;
    else if (it.refLinkStatus === 'NOT_FOUND') notFound += 1;
    else noRef += 1;
  }
  return { total: items.length, linked, notFound, noRef };
}

export function presentShipmentItemForPrint(
  item: ShipmentItemRow,
  lineNo: number,
): ShipmentItemView & { lineNo: number; targetQty: number } {
  const base = presentShipmentItem(item);
  return {
    ...base,
    lineNo,
    targetQty: decimalToNumber(item.quantity.toString()),
  };
}
