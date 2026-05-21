import type {
  ColDef,
  ColDefField,
  GridOptions,
  ISimpleFilterModelType,
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

/** Общие опции сетки: русская локаль, popups в body, без закрытия dropdown при scroll. */
export function getSharedGridOptions(): GridOptions {
  return {
    localeText: AG_GRID_LOCALE_RU,
    popupParent: typeof document !== 'undefined' ? document.body : undefined,
    suppressMenuHide: true,
    /** Иначе dropdown условия фильтра закрывается при scroll в layout (overflow-auto). */
    suppressScrollWhenPopupsAreOpen: true,
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

/** Centered numeric column with tabular figures and fixed width */
export function numericColumnDef<T>(overrides: ColDef<T>): ColDef<T> {
  const width = overrides.width ?? GRID_NUMERIC_COLUMN_WIDTH;
  return {
    type: 'numericColumn',
    suppressSizeToFit: true,
    headerClass: mergeClasses('ag-header-numeric', overrides.headerClass),
    cellClass: mergeClasses('ag-cell-numeric', overrides.cellClass),
    valueFormatter: overrides.valueFormatter ?? ruIntegerFormatter,
    ...overrides,
    width,
    minWidth: overrides.minWidth ?? width,
    maxWidth: overrides.maxWidth ?? width,
  };
}

/** ОСТАТОК — stock quantity */
export function stockQtyColumnDef<T>(field: ColDefField<T>, overrides?: Partial<ColDef<T>>): ColDef<T> {
  return numericColumnDef<T>({
    field,
    headerName: 'ОСТАТОК',
    width: GRID_NUMERIC_COLUMN_WIDTH,
    cellClass: 'ag-cell-stock-qty',
    ...overrides,
  });
}

/** ПАРТИЙ — lot count on nomenclature */
export function lotsCountColumnDef<T>(field: ColDefField<T>, overrides?: Partial<ColDef<T>>): ColDef<T> {
  return numericColumnDef<T>({
    field,
    headerName: 'ПАРТИЙ',
    width: GRID_COUNT_COLUMN_WIDTH,
    cellClass: 'ag-cell-lots-count',
    ...overrides,
  });
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
