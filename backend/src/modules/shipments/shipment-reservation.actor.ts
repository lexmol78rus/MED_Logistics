export type ShipmentReservationActor = {
  email: string;
  userId?: string;
};

export function shipmentReservationActor(
  email?: string | null,
  userId?: string | null,
): ShipmentReservationActor {
  return {
    email: email?.trim() || 'неизвестно',
    userId: userId ?? undefined,
  };
}
