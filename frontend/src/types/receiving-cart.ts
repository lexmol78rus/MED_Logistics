export type ReceivingCartItem = {
  id: string;
  productId: string;
  productName: string;
  productRef: string;
  barcode: string;
  manufacturer: string | null;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  expectedReceiptId: string | null;
  expectedReceiptLabel: string | null;
  operatorEmail: string;
  createdAt: string;
};

export function createReceivingCartItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rcv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
