/** Разделяет «назначение» и длинный операционный комментарий (отгрузка, контракт и т.д.). */
export function parseWriteoffDestinationLabel(label: string): {
  short: string;
  full: string;
  comment: string | null;
} {
  const full = label.trim();
  if (!full) return { short: '', full: '', comment: null };

  const colonIdx = full.indexOf(': ');
  if (colonIdx === -1) return { short: full, full, comment: null };

  const name = full.slice(0, colonIdx).trim();
  const tail = full.slice(colonIdx + 2).trim();
  if (!tail) return { short: name || full, full, comment: null };

  /** Длинный хвост — контекст отгрузки; в ячейке показываем только название назначения. */
  if (tail.length > 36) {
    return { short: name || full, full, comment: tail };
  }

  return { short: full, full, comment: null };
}
