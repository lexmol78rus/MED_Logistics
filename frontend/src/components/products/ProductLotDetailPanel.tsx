import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import type { ProductListItem, ProductLotSummary } from '../../types/api';
import { fetchLots } from '../../lib/api/lots';
import { formatProductLotsSummary, productLotItems } from '../../lib/products/groupProducts';
import { ProductLotStatusBadge } from './ProductLotStatusBadge';

type Props = {
  product: ProductListItem;
};

function mapFetchedLots(items: Awaited<ReturnType<typeof fetchLots>>['items']): ProductLotSummary[] {
  return items.map((l) => ({
    lot: l.lot,
    qty: l.qty,
    expiryDate: l.expiryDate,
    status: l.status,
  }));
}

export function ProductLotDetailPanel({ product }: Props) {
  const navigate = useNavigate();
  const [lots, setLots] = useState<ProductLotSummary[]>(() => productLotItems(product));
  const [loading, setLoading] = useState(false);

  const openProductCard = useCallback(() => {
    navigate(`/products/${product.id}`);
  }, [navigate, product.id]);

  useEffect(() => {
    const embedded = productLotItems(product);
    if (embedded.length > 0) {
      setLots(embedded);
      return;
    }
    if (product.lots <= 1) {
      setLots([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchLots({ productId: product.id, pageSize: 100, fefo: true })
      .then((res) => {
        if (!cancelled) setLots(mapFetchedLots(res.items));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, product.lots, product.lotItems]);

  const displayCount = lots.length > 0 ? lots.length : product.lots;

  return (
    <div className="movement-group-detail">
      <div className="movement-group-detail-banner" aria-hidden>
        <Layers className="movement-group-detail-banner-icon h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
        <span className="movement-group-detail-banner-title">
          {formatProductLotsSummary(displayCount)} · REF {product.ref}
        </span>
      </div>
      <div className="movement-group-detail-list px-3 py-3">
        {loading && lots.length === 0 ? (
          <p className="px-1 text-xs text-slate-500">Загрузка партий…</p>
        ) : null}
        <ul className="space-y-2">
          {lots.map((lot) => (
            <li key={lot.lot}>
              <button
                type="button"
                className="movement-group-detail-card movement-group-detail-card-actionable w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  openProductCard();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-slate-600">
                    <span>
                      <span className="font-semibold text-slate-500">LOT</span> {lot.lot}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-500">Годен до</span>{' '}
                      {lot.expiryDate ?? '—'}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm font-bold tabular-nums text-slate-800">
                      {lot.qty}
                    </span>
                    <ProductLotStatusBadge status={lot.status} />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
