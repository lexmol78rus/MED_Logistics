import { useEffect, useState } from 'react';
import { CalendarClock, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadShiftReport } from '../../lib/export/shiftReport';
import { parseDatetimeLocalValue } from '../../lib/export/shiftReportPeriod';
import type { ShiftReportPresetId } from '../../lib/export/shiftReportPeriod';
import ShiftReportPeriodFields, {
  getDefaultShiftReportPeriod,
} from './ShiftReportPeriodFields';
import { DEFAULT_SETTINGS, loadSettings } from '../../lib/settings/storage';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ShiftReportDialog({ open, onClose }: Props) {
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [activePreset, setActivePreset] = useState<ShiftReportPresetId | null>('today');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaults = getDefaultShiftReportPeriod();
    setFromValue(defaults.fromValue);
    setToValue(defaults.toValue);
    setActivePreset(defaults.preset);
  }, [open]);

  const handleDownload = async () => {
    const from = parseDatetimeLocalValue(fromValue);
    const to = parseDatetimeLocalValue(toValue);
    if (!from || !to) {
      toast.error('Укажите корректные дату и время');
      return;
    }
    if (from > to) {
      toast.error('Начало периода не может быть позже окончания');
      return;
    }

    setLoading(true);
    try {
      const filename = await downloadShiftReport({ from, to });
      toast.success(`Отчёт смены загружен (${filename})`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка формирования отчёта');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const archiveDays =
    loadSettings().activityHistoryRetentionDays ??
    DEFAULT_SETTINGS.activityHistoryRetentionDays;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white border border-slate-300 rounded-lg shadow-xl max-w-lg w-full"
        role="dialog"
        aria-labelledby="shift-report-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80 rounded-t-lg">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-700" />
            <h3 id="shift-report-title" className="text-sm font-bold text-slate-900">
              Отчёт смены
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-500"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            PDF-отчёт по всем операциям вашей учётной записи за выбранный период: приёмка,
            списание, блокировки, карантин и прочие действия. Архив журнала хранится{' '}
            <span className="font-semibold text-slate-800">{archiveDays} суток</span>.
          </p>

          <ShiftReportPeriodFields
            fromValue={fromValue}
            toValue={toValue}
            activePreset={activePreset}
            onFromChange={setFromValue}
            onToChange={setToValue}
            onPresetChange={setActivePreset}
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50/50 rounded-b-lg">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-blue-700 hover:bg-blue-800"
            onClick={() => void handleDownload()}
            disabled={loading}
          >
            <Download className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Формирование…' : 'Скачать PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
