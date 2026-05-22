import { ChevronRight } from 'lucide-react';

type Props = {
  expanded: boolean;
};

export function MovementGroupExpandIcon({ expanded }: Props) {
  return (
    <span
      className={`movement-group-expand-icon flex h-full w-full items-center justify-center text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
      aria-hidden
    >
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}
