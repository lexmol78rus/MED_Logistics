/** Управляющие символы сканера, кроме GS (FNC1) — разделитель полей GS1. */
const SCANNER_CTRL_EXCEPT_GS = /[\x00-\x1e\x7f]/g;
const GS = '\x1d';

/** Фиксированная длина значения по AI (GS1 General Specifications). */
const FIXED_AI_LENGTH: Record<string, number> = {
  '00': 18,
  '01': 14,
  '02': 14,
  '11': 6,
  '12': 6,
  '13': 6,
  '15': 6,
  '16': 6,
  '17': 6,
};

export type Gs1ParsedFields = {
  gtin?: string;
  lot?: string;
  expiryDate?: string;
  serial?: string;
};

export type Gs1ParseResult = {
  isGs1: boolean;
  fields: Gs1ParsedFields;
};

function cleanRawInput(raw: string): string {
  return raw
    .replace(SCANNER_CTRL_EXCEPT_GS, (ch) => (ch === GS ? GS : ''))
    .trim();
}

/** YYMMDD → yyyy-mm-dd (календарные даты 2000–2099). */
export function parseGs1DateYyMmDd(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  let dd = Number(yymmdd.slice(4, 6));
  const yyyy = 2000 + yy;
  if (mm < 1 || mm > 12) return null;
  // GS1: DD=00 — последний день месяца
  if (dd === 0) {
    dd = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
  }
  if (dd < 1 || dd > 31) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) {
    return null;
  }
  return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function applyAi(fields: Gs1ParsedFields, ai: string, value: string): void {
  const v = value.trim();
  if (!v) return;
  switch (ai) {
    case '01':
    case '02':
      fields.gtin = v.replace(/\D/g, '').slice(-14).padStart(14, '0');
      break;
    case '10':
      fields.lot = v;
      break;
    case '17':
    case '15': {
      const iso = parseGs1DateYyMmDd(v);
      if (iso) fields.expiryDate = iso;
      break;
    }
    case '21':
      fields.serial = v;
      break;
    default:
      break;
  }
}

function parseParenthesizedGs1(input: string): Gs1ParsedFields {
  const fields: Gs1ParsedFields = {};
  const re = /\((\d{2,4})\)([^(\x1d]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    applyAi(fields, match[1], match[2]);
  }
  return fields;
}

function readFixedAi(
  input: string,
  pos: number,
  ai: string,
): { value: string; next: number } | null {
  const len = FIXED_AI_LENGTH[ai];
  if (len === undefined) return null;
  const value = input.slice(pos, pos + len);
  if (value.length < len || !/^\d+$/.test(value)) return null;
  return { value, next: pos + len };
}

function parseLinearGs1(input: string): Gs1ParsedFields {
  const fields: Gs1ParsedFields = {};
  let i = 0;
  while (i < input.length) {
    if (input[i] === GS) {
      i += 1;
      continue;
    }
    const two = input.slice(i, i + 2);
    const three = input.slice(i, i + 3);
    const four = input.slice(i, i + 4);

    let ai: string | null = null;
    let aiLen = 0;
    if (FIXED_AI_LENGTH[four] !== undefined) {
      ai = four;
      aiLen = 4;
    } else if (FIXED_AI_LENGTH[three] !== undefined) {
      ai = three;
      aiLen = 3;
    } else if (FIXED_AI_LENGTH[two] !== undefined) {
      ai = two;
      aiLen = 2;
    } else if (two === '10' || two === '21') {
      ai = two;
      aiLen = 2;
    }

    if (!ai) break;

    i += aiLen;
    const fixed = readFixedAi(input, i, ai);
    if (fixed) {
      applyAi(fields, ai, fixed.value);
      i = fixed.next;
      continue;
    }

    const gsIdx = input.indexOf(GS, i);
    const nextAi = input.slice(i).search(/\(\d{2,4}\)|\x1d|01\d{14}|17\d{6}|10/);
    let end = input.length;
    if (gsIdx >= 0 && gsIdx < end) end = gsIdx;
    if (nextAi > 0) end = Math.min(end, i + nextAi);
    const value = input.slice(i, end);
    applyAi(fields, ai, value);
    i = end === gsIdx ? gsIdx + 1 : end;
  }
  return fields;
}

function hasGs1Signals(fields: Gs1ParsedFields, raw: string): boolean {
  if (fields.gtin || fields.lot || fields.expiryDate) return true;
  return /\(\d{2,4}\)/.test(raw) || /^01\d{14}/.test(raw) || raw.includes(GS);
}

/**
 * Разбирает GS1-строку со сканера (human-readable со скобками или бинарная с GS).
 */
export function parseGs1Barcode(raw: string): Gs1ParseResult {
  const cleaned = cleanRawInput(raw);
  if (!cleaned) return { isGs1: false, fields: {} };

  const fields = /\(\d{2,4}\)/.test(cleaned)
    ? parseParenthesizedGs1(cleaned)
    : parseLinearGs1(cleaned);

  return { isGs1: hasGs1Signals(fields, cleaned), fields };
}

export function isIsoDateBeforeToday(isoDate: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const [y, m, d] = isoDate.split('-').map(Number);
  const expiry = new Date(Date.UTC(y, m - 1, d));
  const t = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return expiry.getTime() < t.getTime();
}

export function formatExpiryRu(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
