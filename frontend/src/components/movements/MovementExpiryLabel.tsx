import { HoverHint } from '@/components/ui/HoverHint';
import {
  formatMovementExpiry,
  resolveMovementExpiryTone,
} from '../../lib/movements/expiryDisplay';

type Props = {
  expiryDate: string | null | undefined;
  /** Compact chip for grid cells; inline text in group detail cards. */
  variant?: 'chip' | 'inline';
};

export function MovementExpiryLabel({ expiryDate, variant = 'chip' }: Props) {
  const tone = resolveMovementExpiryTone(expiryDate);
  const label = formatMovementExpiry(expiryDate);

  if (tone === 'empty') {
    return <span className="movement-expiry-empty text-xs">—</span>;
  }

  const className =
    variant === 'inline'
      ? `movement-expiry-label movement-expiry-label--inline movement-expiry-${tone}`
      : `movement-expiry-label movement-expiry-${tone}`;

  if (variant === 'inline') {
    return <span className={className}>{label}</span>;
  }

  return (
    <HoverHint tip={label} className={className}>
      {label}
    </HoverHint>
  );
}
