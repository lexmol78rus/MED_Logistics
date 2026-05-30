import { HoverHint } from '@/components/ui/HoverHint';

/** Компактная цветная точка без текста — индикация доступности номенклатуры. */
const INDICATOR_CLASS =
  'inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm';

export type ProductStatusIndicatorStyle = {
  colorClass: string;
  title: string;
};

/** Цвет и подпись tooltip (3 состояния + legacy-значения с API). */
export function resolveProductStatusIndicator(status: string): ProductStatusIndicatorStyle {
  switch (status) {
    case 'АКТИВЕН':
      return {
        colorClass: 'bg-emerald-500',
        title: 'Активный',
      };
    case 'БЛОК':
    case 'ОТСУТСТВУЕТ':
      return {
        colorClass: 'bg-red-500',
        title: 'Нет доступного остатка',
      };
    case 'КРИТИЧНО':
      return {
        colorClass: 'bg-amber-500',
        title: 'Критичный срок',
      };
    case 'ОЖИДАЕТСЯ':
      return {
        colorClass: 'bg-red-500',
        title: 'Нет доступного остатка',
      };
    case 'ВНИМАНИЕ':
      return {
        colorClass: 'bg-emerald-500',
        title: 'Активный',
      };
    default:
      return {
        colorClass: 'bg-slate-300',
        title: status ? `Статус: ${status}` : 'Статус не определён',
      };
  }
}

export function ProductStatusBadge({ status }: { status: string }) {
  const { colorClass, title } = resolveProductStatusIndicator(status);

  return (
    <HoverHint tip={title}>
      <span className={`${INDICATOR_CLASS} ${colorClass}`} role="img" aria-label={title} />
    </HoverHint>
  );
}
