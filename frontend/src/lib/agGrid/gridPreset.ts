import type {
  CellClassParams,
  ColDef,
  ColDefField,
  GridOptions,
  ISimpleFilterModelType,
  ITooltipParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import type { CSSProperties } from 'react';
import { AG_GRID_LOCALE_RU } from './localeRu';

/** Все стандартные опции текстового фильтра AG Grid (не сужать до contains). */
export const TEXT_COLUMN_FILTER_OPTIONS: ISimpleFilterModelType[] = [
  'contains',
  'notContains',
  'equals',
  'notEqual',
  'startsWith',
  'endsWith',
  'blank',
  'notBlank',
];

export const textColumnFilterParams = {
  filterOptions: TEXT_COLUMN_FILTER_OPTIONS,
  maxNumConditions: 2,
  debounceMs: 200,
};

/** Unified row / header heights for list grids */
export const COMPACT_GRID_ROW_HEIGHT = 40;
export const COMPACT_GRID_HEADER_HEIGHT = 36;

/** Fixed widths for numeric count columns (ОСТАТОК, ПАРТИЙ, etc.) */
export const GRID_NUMERIC_COLUMN_WIDTH = 100;
export const GRID_COUNT_COLUMN_WIDTH = 100;

export const compactGridClassName = 'ag-theme-quartz compact-data-grid';

/** Scrollable list pages (products, lots, users, …) — full-width flex columns */
export const listGridClassName = `${compactGridClassName} list-grid`;

/** Flex weights — conservative ratios to avoid column overlap */
export const GRID_FLEX_NARROW = 0.8;
export const GRID_FLEX_DEFAULT = 1.2;
export const GRID_FLEX_WIDE = 2;
export const GRID_FLEX_PRIMARY = 3.5;

/** Default min widths (px) — floor before horizontal scroll */
export const GRID_MIN_BADGE = 120;
export const GRID_MIN_REF = 170;
export const GRID_MIN_PRIMARY = 260;
export const GRID_MIN_TEXT = 120;
export const GRID_MIN_NUMERIC = 96;

/** CSS class for badge / status renderers (no ellipsis, clipped to column) */
export const GRID_CELL_CLASS_BADGE = 'ag-cell-badge';

/** Paired metric cells on the products grid (ОСТАТОК + БЛИЖАЙШИЙ СРОК). */
export const PRODUCTS_METRIC_CELL_CLASS = 'ag-cell-products-metric';

/**
 * Centered metric column on the nomenclature grid — same AG structure for qty and expiry
 * (no numericColumn type → avoids extra theme styles on «Остаток» only).
 */
export function productsPairedMetricColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const {
    width: _width,
    flex = GRID_FLEX_NARROW,
    minWidth,
    maxWidth,
    headerClass,
    cellClass,
    ...rest
  } = overrides;
  return centeredColumnDef({
    flex,
    minWidth: minWidth ?? GRID_MIN_NUMERIC,
    maxWidth: maxWidth ?? 140,
    suppressSizeToFit: true,
    headerClass: mergeClasses('ag-header-numeric', headerClass),
    cellClass: mergeClasses(PRODUCTS_METRIC_CELL_CLASS, 'ag-cell-numeric', cellClass),
    ...rest,
  });
}

export const compactGridThemeStyle: CSSProperties = {
  '--ag-header-background-color': '#f8fafc',
  '--ag-header-foreground-color': '#64748b',
  '--ag-font-size': '12px',
  '--ag-font-family': 'inherit',
  '--ag-borders-color': '#e2e8f0',
  '--ag-row-hover-color': '#f1f5f9',
  '--ag-cell-horizontal-padding': '8px',
  '--ag-row-height': `${COMPACT_GRID_ROW_HEIGHT}px`,
  '--ag-header-height': `${COMPACT_GRID_HEADER_HEIGHT}px`,
};

export const sharedGridColumnDefaults: ColDef = {
  sortable: true,
  filter: 'agTextColumnFilter',
  filterParams: textColumnFilterParams,
  resizable: true,
  suppressMovable: true,
};

/** CSS-класс ячейки с ellipsis; tooltip показывается только при обрезке (tooltipShowMode). */
export const TRUNCATE_CELL_CLASS = 'ag-cell-truncate';

/** Общие опции сетки: русская локаль, popups в body, без закрытия dropdown при scroll. */
export function getSharedGridOptions(): GridOptions {
  return {
    localeText: AG_GRID_LOCALE_RU,
    popupParent: typeof document !== 'undefined' ? document.body : undefined,
    suppressMenuHide: true,
    /** Иначе dropdown условия фильтра закрывается при scroll в layout (overflow-auto). */
    suppressScrollWhenPopupsAreOpen: true,
    /** Кастомный светлый .ag-tooltip; false — не ставить title на ячейки (иначе двойной tooltip). */
    enableBrowserTooltips: false,
    /** Полный текст при hover только если ячейка обрезана (как Excel / ERP). */
    tooltipShowMode: 'whenTruncated',
    tooltipShowDelay: 500,
    tooltipSwitchShowDelay: 300,
    tooltipHideDelay: 800,
    /** Можно навести на tooltip и выделить текст. */
    tooltipInteraction: true,
    /** Выделение и Ctrl+C в ячейках (REF, LOT, названия и т.д.). */
    enableCellTextSelection: true,
    ensureDomOrder: true,
    /** Единый UX: только virtual scroll внутри grid, без pager footer. */
    pagination: false,
    suppressPaginationPanel: true,
    domLayout: 'normal',
  };
}

/** @deprecated Use getSharedGridOptions() in components so popupParent resolves at runtime. */
export const sharedGridOptions: GridOptions = getSharedGridOptions();

export function createDefaultColDef(overrides?: ColDef): ColDef {
  return { ...sharedGridColumnDefaults, ...overrides };
}

export function formatRuInteger(value: unknown): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('ru-RU');
}

const ruIntegerFormatter = (params: ValueFormatterParams) => formatRuInteger(params.value);

/** Compact column (dates, codes, short labels) */
export function compactColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const { width: _width, flex = GRID_FLEX_NARROW, minWidth, maxWidth, ...rest } = overrides;
  return {
    flex,
    minWidth: minWidth ?? GRID_MIN_TEXT,
    ...(maxWidth != null ? { maxWidth } : {}),
    ...rest,
  };
}

/** Badge / status column — wider minWidth, content clipped inside cell */
export function badgeColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const { width: _width, flex = GRID_FLEX_NARROW, minWidth, maxWidth, cellClass, ...rest } = overrides;
  return compactColumnDef({
    flex,
    minWidth: minWidth ?? GRID_MIN_BADGE,
    maxWidth,
    cellClass: mergeClasses(GRID_CELL_CLASS_BADGE, cellClass),
    ...rest,
  });
}

/** Centered numeric column — small flex, tabular figures */
export function numericColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const {
    width: _width,
    flex = GRID_FLEX_NARROW,
    minWidth,
    maxWidth,
    headerClass,
    cellClass,
    valueFormatter,
    ...rest
  } = overrides;
  return {
    type: 'numericColumn',
    suppressSizeToFit: true,
    flex,
    minWidth: minWidth ?? GRID_MIN_NUMERIC,
    maxWidth: maxWidth ?? 120,
    headerClass: mergeClasses('ag-header-numeric', headerClass),
    cellClass: mergeClasses('ag-cell-numeric', cellClass),
    valueFormatter: valueFormatter ?? ruIntegerFormatter,
    ...rest,
  };
}

/** ОСТАТОК — stock quantity */
export function stockQtyColumnDef<T>(field: ColDefField<T>, overrides?: Partial<ColDef<T>>): ColDef<T> {
  return numericColumnDef<T>({
    field,
    headerName: 'ОСТАТОК',
    cellClass: 'ag-cell-stock-qty',
    ...overrides,
  });
}

/** ПАРТИЙ — lot count on nomenclature */
export function lotsCountColumnDef<T>(field: ColDefField<T>, overrides?: Partial<ColDef<T>>): ColDef<T> {
  return numericColumnDef<T>({
    field,
    headerName: 'ПАРТИЙ',
    cellClass: 'ag-cell-lots-count',
    ...overrides,
  });
}

/** Medium text column (REF, изготовитель, …) */
export function flexTextColumnDef<T>(overrides: ColDef<T>, flex = GRID_FLEX_DEFAULT): ColDef<T> {
  const { width: _width, minWidth, ...rest } = overrides;
  return truncatedTextColumnDef({
    flex,
    minWidth: minWidth ?? GRID_MIN_TEXT,
    ...rest,
  });
}

/** REF column preset */
export function refColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  return flexTextColumnDef(overrides, GRID_FLEX_DEFAULT);
}

/** Primary label column (НОМЕНКЛАТУРА, описание) — largest share */
export function primaryTextColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const { minWidth, ...rest } = overrides;
  return flexTextColumnDef({ minWidth: minWidth ?? GRID_MIN_PRIMARY, ...rest }, GRID_FLEX_PRIMARY);
}

/** Horizontally centered column (FEFO rank, badges, etc.) */
export function centeredColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  return {
    ...overrides,
    headerClass: mergeClasses('ag-header-centered', overrides.headerClass),
    cellClass: mergeClasses('ag-cell-centered', overrides.cellClass),
  };
}

function mergeClasses(base: string, extra?: string | string[]): string {
  const parts = [base];
  if (typeof extra === 'string') parts.push(extra);
  else if (Array.isArray(extra)) parts.push(...extra);
  return parts.filter(Boolean).join(' ');
}

function mergeTruncateCellClass<T>(
  cellClass?: ColDef<T>['cellClass'],
): ColDef<T>['cellClass'] {
  if (!cellClass) return TRUNCATE_CELL_CLASS;
  if (typeof cellClass === 'function') {
    return (params: CellClassParams<T>) => {
      const resolved = cellClass(params);
      return mergeTruncateCellClass(
        resolved as string | string[] | undefined,
      ) as string | string[];
    };
  }
  if (typeof cellClass === 'string') return mergeClasses(TRUNCATE_CELL_CLASS, cellClass);
  return [TRUNCATE_CELL_CLASS, ...cellClass];
}

function resolveTruncatedTooltip<T>(overrides: ColDef<T>): Pick<ColDef<T>, 'tooltipField' | 'tooltipValueGetter'> {
  if (overrides.tooltipValueGetter != null || overrides.tooltipField != null) {
    return {};
  }
  if (overrides.valueGetter != null) {
    const getter = overrides.valueGetter;
    return {
      tooltipValueGetter: (params: ITooltipParams<T>) => {
        const raw =
          typeof getter === 'function'
            ? getter(params as Parameters<typeof getter>[0])
            : params.data?.[getter as keyof T];
        if (raw == null || raw === '') return null;
        const formatted = overrides.valueFormatter
          ? overrides.valueFormatter(params as ValueFormatterParams<T>)
          : String(raw);
        return formatted || null;
      },
    };
  }
  if (overrides.field != null) {
    return { tooltipField: String(overrides.field) };
  }
  return {};
}

/**
 * Текстовая колонка с ellipsis и AG Grid tooltip (полное значение при обрезке).
 */
export function truncatedTextColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const { cellClass, ...rest } = overrides;
  return {
    ...rest,
    cellClass: mergeTruncateCellClass(cellClass),
    ...resolveTruncatedTooltip(overrides),
  };
}
