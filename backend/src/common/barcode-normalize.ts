/** Удаляет управляющие символы сканера (GS, RS и т.д.). */
const SCANNER_CTRL = /[\x00-\x1f\x7f]/g;

/**
 * Строит набор кандидатов для поиска по штрихкоду:
 * исходное значение, GS1 (01)GTIN, без ведущих нулей, хвост EAN-13/14.
 */
export function normalizeScannedBarcode(raw: string): string[] {
  const cleaned = raw.replace(SCANNER_CTRL, '').trim();
  if (!cleaned) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const t = value.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  push(cleaned);

  const gs1Paren = cleaned.match(/\(01\)(\d{14})/);
  if (gs1Paren) push(gs1Paren[1]);

  if (/^01\d{14,}/.test(cleaned)) {
    push(cleaned.slice(2, 16));
    push(cleaned.slice(2));
  }

  if (/^\d+$/.test(cleaned)) {
    const noLeadingZeros = cleaned.replace(/^0+/, '') || '0';
    push(noLeadingZeros);
    if (cleaned.length >= 13) push(cleaned.slice(-13));
    if (cleaned.length >= 14) push(cleaned.slice(-14));
  }

  return out;
}
