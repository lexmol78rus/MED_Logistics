import * as cheerio from 'cheerio';

export type ContractProcurementItem = {
  contractLineNo: number;
  name: string;
  code?: string;
  unit?: string;
  vatRate?: string;
  priceWithVat?: string;
  quantity: string;
  sum?: string;
  country?: string;
};

function normSpace(s: string): string {
  return (s ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoneyLike(raw: string): string {
  const s = normSpace(raw);
  return s;
}

/** Отсекает артефакты парсинга (номер строки «2», обрывки и т.п.). */
export function isPlausibleProcurementName(name: string): boolean {
  const n = normSpace(name);
  if (n.length < 5) return false;
  if (/^\d{1,4}$/.test(n)) return false;
  return true;
}

export function dedupeProcurementItemsByLine(items: ContractProcurementItem[]): ContractProcurementItem[] {
  const byLine = new Map<number, ContractProcurementItem>();
  for (const it of items) {
    if (!isPlausibleProcurementName(it.name)) continue;
    const line = it.contractLineNo;
    const prev = byLine.get(line);
    if (!prev || it.name.length > prev.name.length) {
      byLine.set(line, it);
    }
  }
  return [...byLine.values()].sort((a, b) => a.contractLineNo - b.contractLineNo);
}

function splitQtyUnit(raw: string): { quantity: string; unit?: string } {
  const s = normSpace(raw);
  if (!s) return { quantity: '1' };
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { quantity: '1', unit: s };
  const qty = m[1];
  const unit = normSpace(m[2]);
  if (!unit) return { quantity: qty };
  return { quantity: qty, unit };
}

export function extractProcurementItemsFromHtml(html: string): ContractProcurementItem[] {
  const $ = cheerio.load(html);
  const text = normSpace($.root().text());
  if (!text) return [];

  // Find a table that looks like "Объект закупки" section: has "наименование" header
  const tables = $('table').toArray();
  const candidates = tables
    .map((t) => {
      const $t = $(t);
      const headers = $t
        .find('tr')
        .first()
        .find('th,td')
        .toArray()
        .map((c) => normSpace($(c).text()).toLowerCase());
      const hasName = headers.some((h) => h.includes('наимен'));
      const hasVat = headers.some((h) => h.includes('ндс'));
      const hasPrice = headers.some((h) => h.includes('цена'));
      return { t, score: Number(hasName) + Number(hasVat) + Number(hasPrice) };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates.find((c) => c.score >= 1)?.t;
  if (!best) return [];

  const rows = $(best).find('tr').toArray();
  const out: ContractProcurementItem[] = [];

  for (const r of rows.slice(1)) {
    const cells = $(r)
      .find('td,th')
      .toArray()
      .map((c) => normSpace($(c).text()));

    // Typical "standard" contract tables have 9 columns (like the screenshots),
    // but we accept any row with at least 2 meaningful cells.
    const hasAny = cells.some((c) => c);
    if (!hasAny) continue;

    const lineNoRaw = cells[0] ?? '';
    const lineNo = Number((lineNoRaw.match(/\d+/)?.[0] ?? '').trim());
    if (!Number.isFinite(lineNo) || lineNo <= 0) continue;

    const name = cells[1] ?? '';
    if (!isPlausibleProcurementName(name)) continue;

    const code = cells[3] ?? '';
    const qtyUnitRaw = cells[4] ?? '';
    const price = cells[5] ?? '';
    const vat = cells[6] ?? '';
    const country = cells[7] ?? '';
    const sum = cells[8] ?? '';

    const { quantity, unit } = splitQtyUnit(qtyUnitRaw);

    out.push({
      contractLineNo: lineNo,
      name,
      ...(code ? { code } : {}),
      ...(unit ? { unit } : {}),
      ...(vat ? { vatRate: vat } : {}),
      ...(price ? { priceWithVat: parseMoneyLike(price) } : {}),
      quantity: quantity || '1',
      ...(sum ? { sum: parseMoneyLike(sum) } : {}),
      ...(country ? { country } : {}),
    });
  }

  return dedupeProcurementItemsByLine(out);
}

export function extractProcurementItemsFromPdfText(text: string): ContractProcurementItem[] {
  const raw = (text ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const startIdx = raw.toLowerCase().indexOf('объект закупки');
  const sliced = startIdx >= 0 ? raw.slice(startIdx) : raw;
  const endMarkers = ['характеристики объекта закупки', 'характеристики объекта', '\n4.'];
  let endIdx = sliced.length;
  for (const m of endMarkers) {
    const i = sliced.toLowerCase().indexOf(m);
    if (i >= 0) endIdx = Math.min(endIdx, i);
  }
  const section = sliced.slice(0, endIdx);

  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Group blocks by line numbers ("1", "2", ...). PDF extraction often places each column on a new line.
  const blocks: Array<{ lineNo: number; lines: string[] }> = [];
  let current: { lineNo: number; lines: string[] } | null = null;
  for (const l of lines) {
    const m = l.match(/^(\d{1,3})\s*$/) ?? l.match(/^(\d{1,3})\s+/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) {
        if (current) blocks.push(current);
        const rest = normSpace(l.slice(m[0].length));
        current = { lineNo: n, lines: rest ? [rest] : [] };
        continue;
      }
    }
    if (!current) continue;
    current.lines.push(l);
  }
  if (current) blocks.push(current);

  const moneyRe = /\b\d{1,3}(?:[ \t]\d{3})*(?:[.,]\d{2})?\b/g;
  const vatRe = /(без\s*ндс|\b\d{1,2}\s*%\b)/i;
  const codeRe = /\b\d{2}\.\d{2}\.\d{2}\.\d{3}-\d{5}\b/;

  const out: ContractProcurementItem[] = [];

  for (const b of blocks) {
    const blob = normSpace(b.lines.join(' '));
    if (!blob) continue;

    const code = blob.match(codeRe)?.[0] ?? '';
    const vat = blob.match(vatRe)?.[0] ?? '';

    const monies = blob.match(moneyRe) ?? [];
    const price = monies.length >= 1 ? monies[0] : '';
    const sum = monies.length >= 2 ? monies[monies.length - 1] : '';

    const qtyUnitMatch = blob.match(/\b(\d+(?:[.,]\d+)?)\s*([А-Яа-яA-Za-z].{0,40}?)\b/);
    const quantity = qtyUnitMatch?.[1] ?? '1';
    const unit = qtyUnitMatch ? normSpace(qtyUnitMatch[2]) : undefined;

    // Name: take the first "long" fragment; remove known tokens
    let name = blob;
    if (code) name = name.replace(code, ' ');
    if (vat) name = name.replace(new RegExp(vat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
    if (price) name = name.replace(price, ' ');
    if (sum) name = name.replace(sum, ' ');
    name = normSpace(name);
    if (name.length < 5) continue;

    out.push({
      contractLineNo: b.lineNo,
      name,
      ...(code ? { code } : {}),
      ...(unit ? { unit } : {}),
      ...(vat ? { vatRate: vat } : {}),
      ...(price ? { priceWithVat: price } : {}),
      quantity,
      ...(sum ? { sum } : {}),
    });
  }

  return dedupeProcurementItemsByLine(out);
}

