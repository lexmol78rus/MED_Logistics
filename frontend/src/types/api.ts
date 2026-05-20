export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductListItem = {
  id: string;
  status: string;
  name: string;
  ref: string;
  manufacturer: string | null;
  qty: number;
  lots: number;
  nearestExpiry: string;
  barcode: string | null;
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

export type MovementListItem = {
  id: string;
  date: string;
  type: string;
  productName: string;
  ref: string;
  lot: string | null;
  qty: string;
  user: string;
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
  }[];
};

export type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
};
