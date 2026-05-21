const TECHNICAL_VALIDATION_PATTERNS = [
  /pageSize must not be greater than \d+/i,
  /must not be greater than \d+/i,
  /must not be less than \d+/i,
  /page must not be less than/i,
];

/** Maps backend/API wording to unified REF / LOT UI terminology. */
export function mapApiMessageForUi(message: string): string {
  if (TECHNICAL_VALIDATION_PATTERNS.some((re) => re.test(message))) {
    return 'Ошибка загрузки данных';
  }

  return message
    .replace(/АРТИКУЛ\s*\(SKU\)/gi, 'REF')
    .replace(/Артикул\s*\(SKU\)/gi, 'REF')
    .replace(/Артикул уже существует/gi, 'REF уже существует')
    .replace(/product\s+SKU/gi, 'REF')
    .replace(/invalid\s+SKU/gi, 'некорректный REF')
    .replace(/\bSKU\b/gi, 'REF');
}
