/* eslint-disable @typescript-eslint/no-require-imports */
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

type PdfMakeOutput = {
  getBuffer: () => Promise<Buffer>;
};

type PdfMakeInstance = {
  createPdf: (doc: TDocumentDefinitions) => PdfMakeOutput;
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  virtualfs: {
    writeFileSync: (filename: string, content: Buffer) => void;
  };
};

type RobotoFontPack = {
  vfs: Record<string, { data: string; encoding: string }>;
  fonts: Record<string, Record<string, string>>;
};

let pdfMakeInitialized = false;

function getPdfMake(): PdfMakeInstance {
  const pdfmake = require('pdfmake') as PdfMakeInstance;
  if (!pdfMakeInitialized) {
    const roboto = require('pdfmake/js/browser-extensions/fonts/Roboto.js') as RobotoFontPack;
    for (const [filename, entry] of Object.entries(roboto.vfs)) {
      pdfmake.virtualfs.writeFileSync(filename, Buffer.from(entry.data, 'base64'));
    }
    pdfmake.addFonts(roboto.fonts);
    pdfMakeInitialized = true;
  }
  return pdfmake;
}

export type ShiftReportPdfEvent = {
  at: Date;
  source: 'movement' | 'audit';
  typeLabel: string;
  document: string;
  ref: string;
  product: string;
  lot: string;
  qty: string;
  details: string;
};

export type ShiftReportPdfInput = {
  archiveRetentionDays: number;
  employeeName: string;
  employeeEmail: string;
  roleLabel: string;
  periodFrom: Date;
  periodTo: Date;
  generatedAt: Date;
  events: ShiftReportPdfEvent[];
  summaryByType: { label: string; count: number }[];
};

function formatRuDateTime(d: Date): string {
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRuDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function buildShiftReportPdf(input: ShiftReportPdfInput): Promise<Buffer> {
  const totalOps = input.events.length;
  const movementCount = input.events.filter((e) => e.source === 'movement').length;
  const auditCount = input.events.filter((e) => e.source === 'audit').length;

  const summaryLine =
    input.summaryByType.length > 0
      ? input.summaryByType.map((s) => `${s.label}: ${s.count}`).join('  ·  ')
      : '—';

  const tableBody: unknown[][] = [
    [
      { text: 'Время', style: 'tableHeader' },
      { text: 'Тип', style: 'tableHeader' },
      { text: 'Док. №', style: 'tableHeader' },
      { text: 'REF', style: 'tableHeader' },
      { text: 'Номенклатура', style: 'tableHeader' },
      { text: 'LOT', style: 'tableHeader' },
      { text: 'Кол-во', style: 'tableHeader', alignment: 'right' },
      { text: 'Примечание', style: 'tableHeader' },
    ],
  ];

  if (input.events.length === 0) {
    tableBody.push([
      {
        text: 'За выбранный период операций не зафиксировано',
        colSpan: 8,
        alignment: 'center',
        color: '#64748b',
        italics: true,
        margin: [0, 12, 0, 12],
      },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
    ]);
  } else {
    for (const ev of input.events) {
      const typeFill =
        ev.typeLabel === 'ПРИХОД' || ev.typeLabel === 'РАЗБЛОКИРОВКА'
          ? '#ecfdf5'
          : ev.typeLabel === 'РАСХОД'
            ? '#eff6ff'
            : ev.typeLabel === 'СПИСАНИЕ' || ev.typeLabel === 'БЛОКИРОВКА'
              ? '#fef2f2'
              : ev.source === 'audit'
                ? '#f8fafc'
                : '#fffbeb';

      tableBody.push([
        { text: formatRuDateTime(ev.at), fontSize: 8 },
        {
          text: ev.typeLabel,
          fontSize: 8,
          bold: true,
          fillColor: typeFill,
        },
        { text: ev.document || '—', fontSize: 8 },
        { text: ev.ref || '—', fontSize: 8, color: '#64748b' },
        { text: truncate(ev.product, 42) || '—', fontSize: 8 },
        { text: ev.lot || '—', fontSize: 8, color: '#64748b' },
        {
          text: ev.qty || '—',
          fontSize: 8,
          alignment: 'right',
          bold: !!ev.qty,
        },
        { text: truncate(ev.details, 36) || '—', fontSize: 7, color: '#475569' },
      ]);
    }
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [36, 48, 36, 48],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#1e293b' },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `МЕД-ЛОГИСТИКА СКЛАД PRO · Архив действий хранится ${input.archiveRetentionDays} суток`,
          fontSize: 7,
          color: '#94a3b8',
          margin: [36, 0, 0, 0],
        },
        {
          text: `Стр. ${currentPage} / ${pageCount}`,
          alignment: 'right',
          fontSize: 7,
          color: '#94a3b8',
          margin: [0, 0, 36, 0],
        },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'МЕД-ЛОГИСТИКА СКЛАД PRO', style: 'brand' },
              { text: 'Отчёт смены сотрудника', style: 'title' },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: 'Сформирован', style: 'metaLabel' },
              { text: formatRuDateTime(input.generatedAt), style: 'metaValue' },
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: 'Сотрудник', style: 'infoLabel' },
              { text: input.employeeName, style: 'infoValue' },
              { text: 'Учётная запись', style: 'infoLabel' },
              { text: input.employeeEmail, style: 'infoValue' },
            ],
            [
              { text: 'Роль', style: 'infoLabel' },
              { text: input.roleLabel, style: 'infoValue' },
              { text: 'Период отчёта', style: 'infoLabel' },
              {
                text: `${formatRuDateTime(input.periodFrom)} — ${formatRuDateTime(input.periodTo)}`,
                style: 'infoValue',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          {
            width: '33%',
            stack: [
              { text: 'Всего операций', style: 'kpiLabel' },
              { text: String(totalOps), style: 'kpiValue' },
            ],
          },
          {
            width: '33%',
            stack: [
              { text: 'Движения ТМЦ', style: 'kpiLabel' },
              { text: String(movementCount), style: 'kpiValue' },
            ],
          },
          {
            width: '34%',
            stack: [
              { text: 'Прочие действия', style: 'kpiLabel' },
              { text: String(auditCount), style: 'kpiValue' },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        text: `По типам: ${summaryLine}`,
        fontSize: 8,
        color: '#475569',
        margin: [0, 0, 0, 12],
      },
      {
        text: 'Журнал операций',
        style: 'sectionTitle',
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          headerRows: 1,
          widths: [72, 58, 62, 48, '*', 52, 40, 90],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.3,
          vLineWidth: () => 0.3,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f1f5f9' : null),
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
      {
        text: 'Отчёт содержит только действия, выполненные указанным сотрудником за выбранный интервал. Движения ТМЦ — из журнала складских операций; прочие записи — из журнала аудита (настройки, блокировки, FEFO и т.д.).',
        fontSize: 7,
        color: '#94a3b8',
        margin: [0, 14, 0, 0],
      },
    ] as Content[],
    styles: {
      brand: { fontSize: 9, bold: true, color: '#1d4ed8', characterSpacing: 0.5 },
      title: { fontSize: 16, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
      metaLabel: { fontSize: 7, color: '#94a3b8' },
      metaValue: { fontSize: 9, bold: true, color: '#334155' },
      infoLabel: { fontSize: 8, color: '#64748b', bold: true },
      infoValue: { fontSize: 9, color: '#0f172a' },
      kpiLabel: { fontSize: 7, color: '#64748b', bold: true },
      kpiValue: { fontSize: 18, bold: true, color: '#1e40af', margin: [0, 2, 0, 0] },
      sectionTitle: { fontSize: 10, bold: true, color: '#334155' },
      tableHeader: { fontSize: 7, bold: true, color: '#475569' },
    },
  };

  const pdfDoc = getPdfMake().createPdf(docDefinition);
  return pdfDoc.getBuffer();
}
