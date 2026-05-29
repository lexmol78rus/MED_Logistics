import { ShipmentStatus } from '@prisma/client';
import { normalizeProductRef } from './product-ref.util';

export type ShipmentRefValidation = {
  notFoundRefs: string[];
  isDraft: boolean;
};

export const EDITABLE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.DRAFT,
  ShipmentStatus.NEW,
];

export function isEditableShipmentStatus(status: ShipmentStatus): boolean {
  return EDITABLE_SHIPMENT_STATUSES.includes(status);
}

export function validateShipmentItemRefs(
  items: Array<{ code?: string | null }>,
  refMap: Map<string, string>,
): ShipmentRefValidation {
  const notFoundRefs: string[] = [];
  const seen = new Set<string>();

  for (const it of items) {
    const ref = normalizeProductRef(it.code);
    if (!ref || refMap.has(ref)) continue;
    if (!seen.has(ref)) {
      seen.add(ref);
      notFoundRefs.push(ref);
    }
  }

  return { notFoundRefs, isDraft: notFoundRefs.length > 0 };
}

export function shipmentStatusAfterRefValidation(isDraft: boolean): ShipmentStatus {
  return isDraft ? ShipmentStatus.DRAFT : ShipmentStatus.NEW;
}
