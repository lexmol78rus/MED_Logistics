import { apiBaseUrl } from '../../config/env';
import { useAuthStore } from '../../stores/authStore';

export type ShiftReportPeriod = {
  from: Date;
  to: Date;
  /** Только ADMIN: id сотрудника, по которому формируется отчёт. */
  userId?: string;
};

export async function downloadShiftReport(period: ShiftReportPeriod): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  const params = new URLSearchParams({
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  });
  if (period.userId) {
    params.set('userId', period.userId);
  }
  const url = `${apiBaseUrl}/export/shift-report?${params.toString()}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Ошибка формирования отчёта (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      const raw = body.message;
      if (typeof raw === 'string') message = raw;
      else if (Array.isArray(raw) && raw[0]) message = raw[0];
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('pdf')) {
    throw new Error(
      'Сервер вернул не PDF (возможно, устаревшая версия API). Пересоберите контейнеры: docker compose -f docker-compose.prod.yml up -d --build',
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `otchet_smeny_${period.from.toISOString().slice(0, 10)}.pdf`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  return filename;
}
