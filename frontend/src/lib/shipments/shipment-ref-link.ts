export type ShipmentRefLinkStatus = 'LINKED' | 'NOT_FOUND' | 'NO_REF';

export type ShipmentRefLinkSummary = {
  total: number;
  linked: number;
  notFound: number;
  noRef: number;
};

export function refLinkStatusLabel(status: ShipmentRefLinkStatus): string {
  switch (status) {
    case 'LINKED':
      return 'В номенклатуре';
    case 'NOT_FOUND':
      return 'REF не найден';
    case 'NO_REF':
      return 'Нет REF';
    default:
      return status;
  }
}

export function refLinkStatusClassName(status: ShipmentRefLinkStatus): string {
  switch (status) {
    case 'LINKED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'NOT_FOUND':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'NO_REF':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function refLinkSummaryHint(summary: ShipmentRefLinkSummary): string | null {
  if (summary.notFound > 0) {
    return `${summary.notFound} REF не найдены в номенклатуре — корзина списания будет неполной`;
  }
  if (summary.noRef > 0) {
    return `${summary.noRef} поз. без REF`;
  }
  if (summary.linked === summary.total && summary.total > 0) {
    return 'Все REF привязаны к товарам склада';
  }
  return null;
}
