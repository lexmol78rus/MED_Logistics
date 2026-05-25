type Props = {
  status: string;
};

export function ProductLotStatusBadge({ status }: Props) {
  const color =
    status === 'ОК'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : status === 'КАРАНТИН' || status === 'БЛОК'
        ? 'text-red-700 bg-red-50 border-red-200'
        : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <span
      className={`shrink-0 px-1.5 py-0.5 border rounded text-[8px] uppercase tracking-wider font-bold whitespace-nowrap ${color}`}
    >
      {status}
    </span>
  );
}
