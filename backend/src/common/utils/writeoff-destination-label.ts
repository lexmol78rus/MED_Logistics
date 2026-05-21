import { formatWriteoffDestinationLabel } from '../constants/writeoff-destination';

type DestinationRef = { name: string } | null | undefined;

export function resolveWriteoffDestinationLabel(
  destination: DestinationRef,
  legacyCode: string | null | undefined,
  comment?: string | null,
): string | null {
  if (destination?.name) {
    const base = destination.name.trim();
    if (comment?.trim()) return `${base}: ${comment.trim()}`;
    return base;
  }
  return formatWriteoffDestinationLabel(legacyCode, comment);
}
