import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ShiftReportPeriodFields, {
  getDefaultShiftReportPeriod,
} from '../dashboard/ShiftReportPeriodFields';
import { downloadShiftReport } from '../../lib/export/shiftReport';
import { parseDatetimeLocalValue } from '../../lib/export/shiftReportPeriod';
import type { ShiftReportPresetId } from '../../lib/export/shiftReportPeriod';
import { fetchUsers, roleLabel, userDisplayName, type UserListItem } from '../../lib/api/users';
import { ApiError } from '../../lib/api/client';
import { MAX_PAGE_SIZE } from '../../lib/pagination';
import {
  settingsCardBodyClass,
  settingsCardClass,
  settingsCardHeaderClass,
} from './settingsStyles';
import { DEFAULT_SETTINGS, loadSettings } from '../../lib/settings/storage';
import { toast } from 'sonner';

export function AdminShiftReportCard() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [activePreset, setActivePreset] = useState<ShiftReportPresetId | null>('today');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const defaults = getDefaultShiftReportPeriod();
    setFromValue(defaults.fromValue);
    setToValue(defaults.toValue);
    setActivePreset(defaults.preset);
  }, []);

  useEffect(() => {
    void (async () => {
      setUsersLoading(true);
      try {
        const res = await fetchUsers({ page: 1, pageSize: MAX_PAGE_SIZE });
        const active = res.items.filter((u) => u.isActive);
        setUsers(active);
        if (active.length > 0) {
          setSelectedUserId((prev) => prev || active[0].id);
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить сотрудников');
      } finally {
        setUsersLoading(false);
      }
    })();
  }, []);

  const handleDownload = async () => {
    if (!selectedUserId) {
      toast.error('Выберите сотрудника');
      return;
    }
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
      const filename = await downloadShiftReport({ from, to, userId: selectedUserId });
      toast.success(`Отчёт загружен (${filename})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка формирования отчёта');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const archiveDays =
    loadSettings().activityHistoryRetentionDays ??
    DEFAULT_SETTINGS.activityHistoryRetentionDays;

  return (
    <Card className={settingsCardClass}>
      <CardHeader className={settingsCardHeaderClass}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <CardTitle className="text-sm font-semibold text-slate-900">
            Отчёты смены сотрудников
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-500">
          PDF по операциям выбранного сотрудника за период (администратор и менеджер). Архив
          журнала — {archiveDays} сут.
        </CardDescription>
      </CardHeader>
      <CardContent className={`${settingsCardBodyClass} space-y-4`}>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Сотрудник
          </span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={usersLoading || users.length === 0}
            className="mt-1 w-full h-9 px-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          >
            {usersLoading && <option value="">Загрузка…</option>}
            {!usersLoading && users.length === 0 && (
              <option value="">Нет активных пользователей</option>
            )}
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userDisplayName(u)} — {u.email} ({roleLabel(u.role)})
              </option>
            ))}
          </select>
        </label>

        {selectedUser && (
          <p className="text-xs text-slate-500">
            Отчёт будет сформирован для:{' '}
            <span className="font-medium text-slate-700">{userDisplayName(selectedUser)}</span>
          </p>
        )}

        <ShiftReportPeriodFields
          fromValue={fromValue}
          toValue={toValue}
          activePreset={activePreset}
          onFromChange={setFromValue}
          onToChange={setToValue}
          onPresetChange={setActivePreset}
        />

        <Button
          type="button"
          className="w-full h-9 bg-blue-700 hover:bg-blue-800 text-sm font-medium"
          onClick={() => void handleDownload()}
          disabled={loading || usersLoading || !selectedUserId}
        >
          <Download className={`w-4 h-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Формирование PDF…' : 'Скачать отчёт смены (PDF)'}
        </Button>
      </CardContent>
    </Card>
  );
}
