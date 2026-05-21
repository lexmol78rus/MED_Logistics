export const WRITEOFF_DESTINATION_CODES = [
  'DISPOSAL',
  'DEFECT',
  'INTERNAL',
  'DEPARTMENT',
  'SAMPLES',
  'DAMAGE',
  'EXPIRED',
  'OTHER',
] as const;

export type WriteoffDestinationCode = (typeof WRITEOFF_DESTINATION_CODES)[number];

export const WRITEOFF_DESTINATION_LABELS: Record<WriteoffDestinationCode, string> = {
  DISPOSAL: 'Утилизация',
  DEFECT: 'Брак',
  INTERNAL: 'Внутреннее потребление',
  DEPARTMENT: 'Отделение / кабинет',
  SAMPLES: 'Тест / образцы',
  DAMAGE: 'Повреждение',
  EXPIRED: 'Истёк срок годности',
  OTHER: 'Другое',
};

export function formatWriteoffDestinationLabel(
  code: string | null | undefined,
  comment?: string | null,
): string | null {
  if (!code) return null;
  const base = WRITEOFF_DESTINATION_LABELS[code as WriteoffDestinationCode] ?? code;
  if (code === 'OTHER' && comment?.trim()) {
    return `${base}: ${comment.trim()}`;
  }
  return base;
}
