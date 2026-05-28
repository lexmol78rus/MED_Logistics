import { Link } from 'react-router-dom';
import {
  refLinkStatusClassName,
  refLinkStatusLabel,
  type ShipmentRefLinkStatus,
} from '../../lib/shipments/shipment-ref-link';

type Props = {
  status: ShipmentRefLinkStatus;
  productId?: string | null;
  productRef?: string | null;
  compact?: boolean;
};

export default function ShipmentRefLinkBadge({ status, productId, productRef, compact }: Props) {
  const label = refLinkStatusLabel(status);
  const className = `inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${refLinkStatusClassName(status)}`;

  if (status === 'LINKED' && productId) {
    return (
      <Link to={`/products/${productId}`} className={`${className} hover:opacity-90`} title="Открыть карточку товара">
        {!compact ? label : null}
        {productRef ? <span className="font-mono">{productRef}</span> : null}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}
