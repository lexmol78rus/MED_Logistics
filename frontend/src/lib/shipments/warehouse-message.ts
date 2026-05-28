import type { ShipmentPickingOutcome, ShipmentStatus } from '../api/shipments';

export type WarehouseMessageTone = 'pause' | 'recall' | 'resume' | 'picking-done' | 'info';

export type WarehouseMessageMeta = {
  tone: WarehouseMessageTone;
  label: string;
};

function pickingOutcomeLabel(outcome: ShipmentPickingOutcome | null | undefined): string {
  switch (outcome) {
    case 'SUCCESS':
      return 'Сборка завершена успешно';
    case 'PARTIAL':
      return 'Сборка завершена частично';
    case 'ISSUE':
      return 'Сборка с замечаниями';
    default:
      return 'Сборка завершена';
  }
}

export function resolveWarehouseMessageMeta(shipment: {
  status: ShipmentStatus;
  warehouseMessage: string | null;
  pickingRecalledAt?: string | null;
  pickingOutcome?: ShipmentPickingOutcome | null;
}): WarehouseMessageMeta | null {
  const message = shipment.warehouseMessage?.trim();
  if (!message) return null;

  if (shipment.status === 'PICKING_ON_HOLD') {
    return { tone: 'pause', label: 'Сборка приостановлена' };
  }

  if (shipment.pickingRecalledAt || (shipment.status === 'NEW' && message)) {
    return { tone: 'recall', label: 'Сборка отозвана со склада' };
  }

  if (shipment.status === 'PICKED' || shipment.status === 'DISPATCHED') {
    if (shipment.pickingOutcome) {
      return { tone: 'picking-done', label: pickingOutcomeLabel(shipment.pickingOutcome) };
    }
  }

  if (/^сборка возобновлена/i.test(message)) {
    return { tone: 'resume', label: 'Сборка возобновлена' };
  }

  return { tone: 'info', label: 'Сообщение для склада' };
}
