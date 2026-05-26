/** Значение для input[type=datetime-local] (локальное время браузера). */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type ShiftReportPresetId = 'today' | 'yesterday' | 'week' | 'month';

export function resolveShiftReportPreset(id: ShiftReportPresetId): { from: Date; to: Date } {
  const now = new Date();
  switch (id) {
    case 'today':
      return { from: startOfDay(now), to: now };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'week': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to: now };
    }
    case 'month': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { from, to: now };
    }
    default:
      return { from: startOfDay(now), to: now };
  }
}
