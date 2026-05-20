/** Maps backend/API wording to unified REF / LOT UI terminology. */
export function mapApiMessageForUi(message: string): string {
  return message
    .replace(/АРТИКУЛ\s*\(SKU\)/gi, 'REF')
    .replace(/Артикул\s*\(SKU\)/gi, 'REF')
    .replace(/Артикул уже существует/gi, 'REF уже существует')
    .replace(/product\s+SKU/gi, 'REF')
    .replace(/invalid\s+SKU/gi, 'некорректный REF')
    .replace(/\bSKU\b/gi, 'REF');
}
