import { CheckCircle2, MessageSquare, PauseCircle, PlayCircle, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WarehouseMessageTone } from '../../lib/shipments/warehouse-message';

const TONE_STYLES: Record<
  WarehouseMessageTone,
  { box: string; icon: string; label: string }
> = {
  pause: {
    box: 'border-orange-300 bg-orange-50 text-orange-950',
    icon: 'text-orange-600',
    label: 'text-orange-800',
  },
  recall: {
    box: 'border-red-300 bg-red-50 text-red-950',
    icon: 'text-red-600',
    label: 'text-red-800',
  },
  resume: {
    box: 'border-blue-300 bg-blue-50 text-blue-950',
    icon: 'text-blue-600',
    label: 'text-blue-800',
  },
  info: {
    box: 'border-amber-300 bg-amber-50 text-amber-950',
    icon: 'text-amber-700',
    label: 'text-amber-900',
  },
  'picking-done': {
    box: 'border-violet-300 bg-violet-50 text-violet-950',
    icon: 'text-violet-600',
    label: 'text-violet-800',
  },
};

const TONE_ICONS = {
  pause: PauseCircle,
  recall: Undo2,
  resume: PlayCircle,
  info: MessageSquare,
  'picking-done': CheckCircle2,
} as const;

type Props = {
  tone: WarehouseMessageTone;
  label: string;
  message: string;
  compact?: boolean;
  className?: string;
};

export default function ShipmentWarehouseMessageBanner({
  tone,
  label,
  message,
  compact = false,
  className,
}: Props) {
  const styles = TONE_STYLES[tone];
  const Icon = TONE_ICONS[tone];

  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-lg border',
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
        styles.box,
        className,
      )}
      role="note"
    >
      <Icon className={cn('shrink-0', compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5 mt-0.5', styles.icon)} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'font-bold uppercase tracking-wide',
            compact ? 'text-[9px]' : 'text-[10px]',
            styles.label,
          )}
        >
          {label}
        </div>
        <p
          className={cn(
            'mt-0.5 leading-snug whitespace-pre-wrap break-words',
            compact ? 'text-[11px]' : 'text-sm',
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
