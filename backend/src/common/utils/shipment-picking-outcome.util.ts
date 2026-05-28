import { ShipmentPickingOutcome } from '@prisma/client';

const OUTCOME_LABELS: Record<ShipmentPickingOutcome, string> = {
  SUCCESS: 'Сборка завершена успешно',
  PARTIAL: 'Сборка завершена частично',
  ISSUE: 'Сборка с замечаниями / нехватка',
};

export function shipmentPickingOutcomeLabel(outcome: ShipmentPickingOutcome): string {
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function formatPickingCompleteWarehouseMessage(
  outcome: ShipmentPickingOutcome,
  comment: string,
): string {
  return `${shipmentPickingOutcomeLabel(outcome)}. ${comment.trim()}`;
}

export function formatShipmentWriteoffMovementComment(params: {
  shipmentId: string;
  contractNumber?: string | null;
  counterpartyName?: string | null;
  itemComment?: string | null;
}): string {
  const shortId = params.shipmentId.slice(0, 8);
  const parts = [`Отгрузка #${shortId}`];
  if (params.contractNumber?.trim()) parts.push(`контракт ${params.contractNumber.trim()}`);
  if (params.counterpartyName?.trim()) parts.push(params.counterpartyName.trim());
  const head = parts.join(' · ');
  const extra = params.itemComment?.trim();
  return extra ? `${head} · ${extra}` : head;
}
