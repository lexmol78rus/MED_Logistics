export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductLotSummary = {
  lot: string;
  qty: number;
  expiryDate: string | null;
  status: string;
  location?: string | null;
};

export type ProductListItem = {
  id: string;
  status: string;
  name: string;
  ref: string;
  lot: string | null;
  manufacturer: string | null;
  qty: number;
  lots: number;
  lotItems?: ProductLotSummary[];
  nearestExpiry: string;
  barcode: string | null;
  location?: string | null;
};

export type ProductDetail = ProductListItem & {
  category: string | null;
  storageCond: string | null;
};

export type LotListItem = {
  id: string;
  productId: string;
  productName: string;
  ref: string;
  lot: string;
  expiryDate: string | null;
  qty: number;
  location: string | null;
  status: string;
  fefoRank: number;
};

export type MovementCorrectionMeta = {
  correctedBy: string;
  correctedAt: string;
  reason: string;
  originalReference: string | null;
};

export type MovementListItem = {
  id: string;
  productId: string;
  date: string;
  type: string;
  destination: string | null;
  productName: string;
  ref: string;
  lot: string | null;
  expiryDate: string | null;
  qty: string;
  user: string;
  operationGroupId?: string | null;
  comment?: string | null;
  isCorrection?: boolean;
  hasCorrections?: boolean;
  correctionCount?: number;
  lastCorrection?: MovementCorrectionMeta | null;
  correctionSessionId?: string | null;
  effectiveWriteoffQty?: number | null;
  editReason?: string | null;
};

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

export type WriteoffRecommendation = {
  productId: string;
  name: string;
  ref: string;
  totalQty: number;
  lots: {
    lotId: string;
    lot: string;
    expiry: string;
    qty: number;
    fefo: boolean;
    expired?: boolean;
  }[];
};

export type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
};
