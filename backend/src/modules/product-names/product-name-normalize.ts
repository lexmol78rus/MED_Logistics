/** Нормализация наименования для поиска и уникальности (без учёта регистра и лишних пробелов). */
export function normalizeProductNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
