import type { UserRole } from '../rbac/permissions';

/** На РМП создаём товар при неизвестном коде, пока роль не VIEWER (в т.ч. до гидрации user). */
export function shouldOpenReceivingCreateModal(role: UserRole | null): boolean {
  return role !== 'VIEWER';
}

export function isNotFoundScanError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = 'status' in err ? Number((err as { status: number }).status) : NaN;
  if (status === 404) return true;
  const message =
    'message' in err && typeof (err as { message: string }).message === 'string'
      ? (err as { message: string }).message.toLowerCase()
      : '';
  return (
    message.includes('не найден') ||
    message.includes('not found') ||
    message.includes('штрихкод')
  );
}
