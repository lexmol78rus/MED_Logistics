import { useState } from 'react';
import { Button } from '@/components/ui/button';
import DestinationSelect from '../writeoff/DestinationSelect';
import { fetchWriteoffDestinations } from '../../lib/api/writeoff-destinations';

type Props = {
  open: boolean;
  shipmentId: string;
  customerName: string;
  linkedCount: number;
  totalCount: number;
  onCancel: () => void;
  onConfirm: (destinationId: string, destinationLabel: string) => void;
};

export default function ShipmentWriteoffNavigateDialog({
  open,
  shipmentId,
  customerName,
  linkedCount,
  totalCount,
  onCancel,
  onConfirm,
}: Props) {
  const [destinationId, setDestinationId] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');

  if (!open) return null;

  const handleDestinationChange = async (id: string, label?: string) => {
    if (!id) {
      setDestinationId('');
      setDestinationLabel('');
      return;
    }
    if (label) {
      setDestinationId(id);
      setDestinationLabel(label);
      return;
    }
    setDestinationId(id);
    try {
      const data = await fetchWriteoffDestinations({ activeOnly: true, pageSize: 200 });
      const found = data.items.find((d) => d.id === id);
      setDestinationLabel(found?.name ?? '');
    } catch {
      setDestinationLabel('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="shipment-writeoff-dialog-title"
      >
        <h2 id="shipment-writeoff-dialog-title" className="text-base font-bold text-slate-900">
          Корзина списания по отгрузке
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-snug">
          Заказчик: <span className="font-medium text-slate-800">{customerName}</span>
          <br />
          Привязано REF: {linkedCount} из {totalCount}. На странице списания корзина заполнится по позициям
          с FEFO.
        </p>
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Куда списываем
          </label>
          <div className="mt-1">
            <DestinationSelect value={destinationId} onChange={handleDestinationChange} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!destinationId}
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => onConfirm(destinationId, destinationLabel || destinationId)}
          >
            Перейти к списанию
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-slate-400 font-mono truncate" title={shipmentId}>
          {shipmentId}
        </p>
      </div>
    </div>
  );
}
