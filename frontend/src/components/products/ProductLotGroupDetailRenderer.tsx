import { useLayoutEffect, useRef, type MutableRefObject } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ProductGridRow } from '../../lib/products/groupProducts';
import { COMPACT_GRID_ROW_HEIGHT } from '../../lib/agGrid/gridPreset';
import { ProductLotDetailPanel } from './ProductLotDetailPanel';

const DETAIL_ROW_HEIGHT_COMPENSATION = COMPACT_GRID_ROW_HEIGHT + 8;

function measureDetailContentHeight(host: HTMLElement): number {
  const shell = host.querySelector('.movement-group-expanded-shell') as HTMLElement | null;
  const target = shell ?? host;
  const rect = target.getBoundingClientRect();
  return Math.ceil(Math.max(target.scrollHeight, target.offsetHeight, rect.height));
}

function applyDetailRowHeight(
  params: ICellRendererParams<ProductGridRow>,
  measuredHeight: number,
  lastHeightRef: MutableRefObject<number>,
) {
  const height = measuredHeight + DETAIL_ROW_HEIGHT_COMPENSATION;
  if (measuredHeight <= 0 || height === lastHeightRef.current) return;
  lastHeightRef.current = height;
  params.node.setRowHeight(height);
  params.api.onRowHeightChanged();
  requestAnimationFrame(() => {
    params.api.onRowHeightChanged();
  });
}

export function ProductLotGroupDetailRenderer(params: ICellRendererParams<ProductGridRow>) {
  const product = params.data?.product;
  const hostRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !product) return;

    lastHeightRef.current = 0;

    const syncHeight = () => {
      applyDetailRowHeight(params, measureDetailContentHeight(host), lastHeightRef);
    };

    syncHeight();

    const observer = new ResizeObserver(() => {
      syncHeight();
    });
    observer.observe(host);

    const raf = requestAnimationFrame(syncHeight);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [params.api, params.node, product]);

  if (!product) return null;

  return (
    <div
      ref={hostRef}
      className="movement-group-detail-host w-full"
      role="region"
      aria-label="Партии номенклатуры"
    >
      <div className="movement-group-expanded-shell">
        <ProductLotDetailPanel product={product} />
      </div>
    </div>
  );
}
