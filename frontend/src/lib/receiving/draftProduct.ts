export const DRAFT_PRODUCT_PREFIX = 'draft:';

export function isDraftProductId(id: string): boolean {
  return id.startsWith(DRAFT_PRODUCT_PREFIX);
}

export function createDraftProductId(barcode: string): string {
  return `${DRAFT_PRODUCT_PREFIX}${barcode}`;
}
