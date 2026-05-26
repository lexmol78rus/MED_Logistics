import { Button } from '@/components/ui/button';
import {
  resolveShiftReportPreset,
  toDatetimeLocalValue,
  type ShiftReportPresetId,
} from '../../lib/export/shiftReportPeriod';

const PRESETS: { id: ShiftReportPresetId; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: 'week', label: '7 дней' },
  { id: 'month', label: '30 дней' },
];

type Props = {
  fromValue: string;
  toValue: string;
  activePreset: ShiftReportPresetId | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPresetChange: (preset: ShiftReportPresetId | null) => void;
};

export function getDefaultShiftReportPeriod(): {
  fromValue: string;
  toValue: string;
  preset: ShiftReportPresetId;
} {
  const { from, to } = resolveShiftReportPreset('today');
  return {
    fromValue: toDatetimeLocalValue(from),
    toValue: toDatetimeLocalValue(to),
    preset: 'today',
  };
}

export default function ShiftReportPeriodFields({
  fromValue,
  toValue,
  activePreset,
  onFromChange,
  onToChange,
  onPresetChange,
}: Props) {
  const applyPreset = (id: ShiftReportPresetId) => {
    const { from, to } = resolveShiftReportPreset(id);
    onFromChange(toDatetimeLocalValue(from));
    onToChange(toDatetimeLocalValue(to));
    onPresetChange(id);
  };

  return (
    <>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Быстрый выбор
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${
                activePreset === p.id
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-slate-300'
              }`}
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Начало периода
          </span>
          <input
            type="datetime-local"
            value={fromValue}
            onChange={(e) => {
              onFromChange(e.target.value);
              onPresetChange(null);
            }}
            className="mt-1 w-full h-9 px-2 text-sm border border-slate-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Окончание периода
          </span>
          <input
            type="datetime-local"
            value={toValue}
            onChange={(e) => {
              onToChange(e.target.value);
              onPresetChange(null);
            }}
            className="mt-1 w-full h-9 px-2 text-sm border border-slate-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </label>
      </div>
    </>
  );
}
