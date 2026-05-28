/** Склад в Санкт-Петербурге — MSK (UTC+3), без перехода на летнее время. */
export const APP_TIMEZONE = 'Europe/Moscow';

/** DD.MM.YYYY HH:mm в часовом поясе склада. */
export function formatAppDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
}

export function formatAppDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
