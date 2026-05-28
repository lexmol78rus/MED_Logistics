import { fixScannerKeyboardLayout } from './fix-keyboard-layout';

/** Удаляет управляющие символы сканера (GS, RS и т.д.). */
const SCANNER_CTRL = /[\x00-\x1f\x7f]/g;

function appendBarcodeVariants(
  value: string,
  push: (candidate: string) => void,
): void {
  push(value);

  const gs1Paren = value.match(/\(01\)(\d{14})/);
  if (gs1Paren) push(gs1Paren[1]);

  if (/^01\d{14,}/.test(value)) {
    push(value.slice(2, 16));
    push(value.slice(2));
  }

  if (/^\d+$/.test(value)) {
    const noLeadingZeros = value.replace(/^0+/, '') || '0';
    push(noLeadingZeros);
    if (value.length >= 13) push(value.slice(-13));
    if (value.length >= 14) push(value.slice(-14));
  }
}

/**
 * Строит набор кандидатов для поиска по штрихкоду:
 * исходное значение, раскладка US QWERTY, GS1 (01)GTIN, без ведущих нулей, хвост EAN-13/14.
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

  const bases = [cleaned];
  const layoutFixed = fixScannerKeyboardLayout(cleaned);
  if (layoutFixed !== cleaned) {
    bases.push(layoutFixed);
  }

  for (const base of bases) {
    appendBarcodeVariants(base, push);
  }

  return out;
}
