export type WriteoffCartLine = {
  lotId: string;
  lotNumber: string;
  quantity: number;
  expiry?: string;
  expired?: boolean;
};

export type WriteoffCartItem = {
  id: string;
  productId: string;
  productName: string;
  productRef: string;
  writeOffDestinationId: string;
  destinationLabel: string;
  writeOffComment: string;
  useFefoRecommendations: boolean;
  lines: WriteoffCartLine[];
  totalQty: number;
  operatorEmail: string;
  createdAt: string;
  /** Привязка к отгрузке (списание по сборке). */
  shipmentId?: string;
};

export function createWriteoffCartItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type WriteoffBatchPayload = {
  shipmentId?: string;
  items: {
    productId: string;
    writeOffDestinationId: string;
    writeOffComment?: string;
    lines: { lotId: string; quantity: number }[];
    useFefoRecommendations?: boolean;
  }[];
};
