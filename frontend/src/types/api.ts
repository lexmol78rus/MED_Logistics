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

export type ProductAssemblyHold = {
  quantity: number;
  reservedBy: string;
  shipmentId: string;
  shipmentStatus: string;
  customerName: string | null;
};

export type ProductListItem = {
  id: string;
  status: string;
  name: string;
  ref: string;
  lot: string | null;
  manufacturer: string | null;
  qty: number;
  availableQty?: number;
  lots: number;
  lotItems?: ProductLotSummary[];
  nearestExpiry: string;
  barcode: string | null;
  gtin?: string | null;
  location?: string | null;
  assemblyReservedQty?: number;
  assemblyHolds?: ProductAssemblyHold[];
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
  shipmentId?: string | null;
  shipmentLabel?: string | null;
};

export type BarcodeKind = 'gs1' | 'ean' | 'plain' | 'unknown';

export type ScanParsedFields = {
  gtin?: string;
  lot?: string;
  expiryDate?: string;
  serial?: string;
};

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
