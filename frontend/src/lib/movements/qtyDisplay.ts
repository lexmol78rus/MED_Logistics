export function movementQtyTone(value: unknown): 'in' | 'out' | 'zero' | 'neutral' {
  const qty = String(value ?? '');
  if (qty === '0') return 'zero';
  if (qty.startsWith('+')) return 'in';
  if (qty.startsWith('-')) return 'out';
  return 'neutral';
}

export function movementQtyClass(qty: string): string {
  switch (movementQtyTone(qty)) {
    case 'in':
      return 'text-emerald-700';
    case 'out':
      return 'text-red-700';
    case 'zero':
      return 'text-slate-500';
    default:
      return 'text-slate-700';
  }
}
