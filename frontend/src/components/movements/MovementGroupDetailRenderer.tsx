import { useLayoutEffect, useRef, type MutableRefObject } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { MovementGridRow } from '../../lib/movements/groupMovements';
import { COMPACT_GRID_ROW_HEIGHT } from '../../lib/agGrid/gridPreset';
import { MovementGroupDetailPanel } from './MovementGroupDetailPanel';

/** Full-width detail rows often undershoot DOM by ~1 compact grid row — reserve extra AG Grid height. */
const DETAIL_ROW_HEIGHT_COMPENSATION = COMPACT_GRID_ROW_HEIGHT + 8;

export type MovementGroupDetailRendererContext = {
  canEditWriteoff?: boolean;
  onEditGroup?: (row: MovementGridRow) => void;
  formatOperator?: (email: string | null | undefined) => string;
};

function measureDetailContentHeight(host: HTMLElement): number {
  const shell = host.querySelector('.movement-group-expanded-shell') as HTMLElement | null;
  const target = shell ?? host;
  const rect = target.getBoundingClientRect();
  return Math.ceil(Math.max(target.scrollHeight, target.offsetHeight, rect.height));
}

function applyDetailRowHeight(
  params: ICellRendererParams<MovementGridRow>,
  measuredHeight: number,
  lastHeightRef: MutableRefObject<number>,
) {
  const height = measuredHeight + DETAIL_ROW_HEIGHT_COMPENSATION;
  if (measuredHeight <= 0 || height === lastHeightRef.current) return;
  lastHeightRef.current = height;
  params.node.setRowHeight(height);
  params.api.onRowHeightChanged();
  // Second pass after layout — keeps full-width row from visually overlapping neighbors.
  requestAnimationFrame(() => {
    params.api.onRowHeightChanged();
  });
}

export function MovementGroupDetailRenderer(
  params: ICellRendererParams<MovementGridRow, unknown, MovementGroupDetailRendererContext>,
) {
  const items = params.data?.groupItems;
  const hostRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !items?.length) return;

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
  }, [params.api, params.node, items, params.context?.canEditWriteoff]);

  if (!items?.length) return null;

  const ctx = params.context;
  return (
    <div ref={hostRef} className="movement-group-detail-host w-full" role="region" aria-label="Раскрытая групповая операция">
      <div className="movement-group-expanded-shell">
        <MovementGroupDetailPanel
          items={items}
          canEdit={ctx?.canEditWriteoff}
          formatOperator={ctx?.formatOperator}
          onEdit={ctx?.onEditGroup && params.data ? () => ctx.onEditGroup!(params.data!) : undefined}
        />
      </div>
    </div>
  );
}
