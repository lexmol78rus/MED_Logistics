import {
  formatExpiryRu,
  isIsoDateBeforeToday,
  parseGs1Barcode,
  type Gs1ParsedFields,
} from './gs1-parse';

export type BarcodeKind = 'gs1' | 'ean' | 'plain' | 'unknown';

export type ScanParsedFields = Gs1ParsedFields;

export type ScanAnalysis = {
  kind: BarcodeKind;
  /** Поля для автозаполнения формы (срок из просроченного штрих-кода сюда не попадает). */
  parsed: ScanParsedFields;
  /** Срок, прочитанный из штрих-кода (даже если он в прошлом — для подсказки кладовщику). */
  barcodeExpiryDate?: string;
  expiryWarning?: string;
  hints: string[];
};

function classifyKind(raw: string, gs1: ReturnType<typeof parseGs1Barcode>): BarcodeKind {
  if (gs1.isGs1) return 'gs1';
  const digits = raw.replace(/\D/g, '');
  if (/^\d{8,14}$/.test(digits) && digits === raw.replace(/[\s-]/g, '')) return 'ean';
  if (raw.length > 0) return 'plain';
  return 'unknown';
}

export function analyzeScannedBarcode(raw: string): ScanAnalysis {
  const trimmed = raw.trim();
  const gs1 = parseGs1Barcode(trimmed);
  const kind = classifyKind(trimmed, gs1);
  const parsed: ScanParsedFields = { ...gs1.fields };
  const hints: string[] = [];
  let barcodeExpiryDate: string | undefined;
  let expiryWarning: string | undefined;

  if (parsed.expiryDate && isIsoDateBeforeToday(parsed.expiryDate)) {
    barcodeExpiryDate = parsed.expiryDate;
    delete parsed.expiryDate;
    expiryWarning =
      `В штрих-коде указан срок ${formatExpiryRu(barcodeExpiryDate)} (уже истёк). ` +
      'На этикетке часто напечатан другой срок — введите «Годен до» с упаковки. Приёмка блокируется только если введённый срок в прошлом.';
  }

  if (kind === 'gs1') {
    if (parsed.lot && parsed.expiryDate) {
      hints.push('Код с этикетки: срок годности и партия подставлены автоматически. Проверьте и укажите количество.');
    } else if (parsed.lot && barcodeExpiryDate) {
      hints.push('Партия (LOT) подставлена. Срок из штрих-кода просрочен — введите «Годен до» с этикетки.');
    } else if (parsed.expiryDate) {
      hints.push('Код с этикетки: срок годности подставлен. Укажите партию (LOT) с этикетки.');
    } else if (parsed.lot) {
      hints.push('Код с этикетки: партия подставлена. Укажите срок годности с этикетки.');
    } else {
      hints.push('Код с этикетки распознан частично. Проверьте партию и срок на упаковке.');
    }
    if (!parsed.lot || !parsed.expiryDate) {
      hints.push('REF (артикул) при новом товаре вводится вручную с этикетки — в этом штрих-коде его нет.');
    }
  } else if (kind === 'ean') {
    hints.push('Простой штрих-код: введите партию (LOT) и срок годности с этикетки вручную.');
  } else {
    hints.push('Код не по стандарту GS1. Заполните данные с этикетки вручную.');
  }

  if (expiryWarning) {
    hints.push(expiryWarning);
  }

  return { kind, parsed, barcodeExpiryDate, expiryWarning, hints };
}
