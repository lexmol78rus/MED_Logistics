import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  roleLabel,
  updateUser,
  userDisplayName,
  type UserListItem,
} from '../lib/api/users';
import type { UserRole } from '../lib/rbac/permissions';
import { ROLE_LABELS } from '../lib/rbac/permissions';
import { ApiError } from '../lib/api/client';
import {
  isWeakPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_HINT,
  PASSWORD_WEAK_HINT,
} from '../lib/passwordPolicy';
import { useUserStore } from '../stores/userStore';
import { createDefaultColDef, sharedGridOptions } from '../lib/agGrid/gridPreset';

const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Users() {
  const currentUser = useUserStore((s) => s.user);
  const gridRef = useRef<AgGridReact<UserListItem>>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [rowData, setRowData] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATOR');
  const [newActive, setNewActive] = useState(true);
  const [resetPassword, setResetPasswordValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({
        page,
        pageSize,
        search: debouncedSearch || undefined,
      });
      setRowData(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить пользователей');
      setRowData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleToggleActive = useCallback(
    async (user: UserListItem) => {
      if (user.id === currentUser?.userId && user.isActive) {
        toast.error('Нельзя отключить свою учётную запись');
        return;
      }
      try {
        await updateUser(user.id, { isActive: !user.isActive });
        toast.success(user.isActive ? 'Пользователь отключён' : 'Пользователь включён');
        await loadUsers();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Ошибка обновления');
      }
    },
    [currentUser?.userId, loadUsers],
  );

  const handleRoleChange = useCallback(
    async (user: UserListItem, role: UserRole) => {
      try {
        await updateUser(user.id, { role });
        toast.success('Роль обновлена');
        await loadUsers();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Ошибка обновления роли');
      }
    },
    [loadUsers],
  );

  const columnDefs = useMemo<ColDef<UserListItem>[]>(
    () => [
      {
        headerName: 'ИМЯ',
        flex: 1,
        minWidth: 140,
        valueGetter: (p) => (p.data ? userDisplayName(p.data) : ''),
        cellClass: 'font-medium text-slate-800',
      },
      { field: 'email', headerName: 'EMAIL', flex: 1, minWidth: 200 },
      {
        field: 'role',
        headerName: 'РОЛЬ',
        width: 160,
        cellRenderer: (params: ICellRendererParams<UserListItem>) => {
          const user = params.data;
          if (!user) return null;
          return (
            <select
              className="h-7 w-full text-xs border border-slate-300 rounded px-1"
              value={user.role}
              onChange={(e) => void handleRoleChange(user, e.target.value as UserRole)}
              disabled={user.id === currentUser?.userId}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        field: 'isActive',
        headerName: 'СТАТУС',
        width: 110,
        cellRenderer: (params: ICellRendererParams<UserListItem>) => (
          <span
            className={
              params.value
                ? 'text-emerald-700 font-bold text-[10px]'
                : 'text-red-600 font-bold text-[10px]'
            }
          >
            {params.value ? 'Активен' : 'Отключён'}
          </span>
        ),
      },
      {
        field: 'lastLoginAt',
        headerName: 'ПОСЛЕДНИЙ ВХОД',
        width: 150,
        valueFormatter: (p) => formatDateTime(p.value as string | null),
        cellClass: 'font-mono text-[10px] text-slate-600',
      },
      {
        field: 'createdAt',
        headerName: 'СОЗДАН',
        width: 150,
        valueFormatter: (p) => formatDateTime(p.value as string),
        cellClass: 'font-mono text-[10px] text-slate-500',
      },
      {
        headerName: 'ДЕЙСТВИЯ',
        width: 280,
        cellRenderer: (params: ICellRendererParams<UserListItem>) => {
          const user = params.data;
          if (!user) return null;
          const isSelf = user.id === currentUser?.userId;
          return (
            <div className="flex items-center gap-1 h-full flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setResetOpen(user)}
              >
                Сброс пароля
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={isSelf}
                onClick={() => void handleToggleActive(user)}
              >
                {user.isActive ? 'Отключить' : 'Включить'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                disabled={isSelf}
                onClick={() => setDeleteTarget(user)}
              >
                Удалить
              </Button>
            </div>
          );
        },
      },
    ],
    [currentUser?.userId, handleRoleChange, handleToggleActive],
  );

  const defaultColDef = useMemo(() => createDefaultColDef(), []);

  const gridThemeStyle = {
    '--ag-header-background-color': '#f8fafc',
    '--ag-font-size': '12px',
  } as CSSProperties;

  const handleCreate = async () => {
    try {
      await createUser({
        displayName: newName.trim() || undefined,
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        isActive: newActive,
      });
      toast.success('Пользователь создан');
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('OPERATOR');
      setNewActive(true);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка создания');
    }
  };

  const handleReset = async () => {
    if (!resetOpen) return;
    try {
      await resetUserPassword(resetOpen.id, resetPassword);
      toast.success('Пароль сброшен');
      setResetOpen(null);
      setResetPasswordValue('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сброса пароля');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.userId) {
      toast.error('Нельзя удалить свою учётную запись');
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteUser(deleteTarget.id);
      toast.success('Пользователь удалён');
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось удалить пользователя');
    }
  };

  return (
    <div className="h-full flex flex-col max-w-screen-2xl mx-auto gap-4">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 text-violet-700 rounded">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Пользователи</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              Управление учётными записями
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs font-semibold bg-blue-700 hover:bg-blue-800"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Создать пользователя
        </Button>
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0">
        <div className="p-2.5 border-b border-slate-200 bg-slate-50">
          <div className="relative w-96 flex">
            <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Поиск по email..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 w-full relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div className="ag-theme-quartz absolute inset-0" style={gridThemeStyle}>
            <AgGridReact
              {...sharedGridOptions}
              theme="legacy"
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={44}
              headerHeight={36}
            />
          </div>
        </div>

        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          Всего: {total}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Имя</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={PASSWORD_MIN_LENGTH}
                required
              />
              <p className="mt-1 text-xs text-slate-500">{PASSWORD_MIN_LENGTH_HINT}</p>
              {isWeakPassword(newPassword) ? (
                <p className="mt-1 text-xs text-amber-700">{PASSWORD_WEAK_HINT}</p>
              ) : null}
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
              />
              Активен
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleCreate()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить пользователя?"
        message="Пользователь будет деактивирован и потеряет доступ к системе."
        confirmLabel="Удалить"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog open={!!resetOpen} onOpenChange={(o) => !o && setResetOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сброс пароля — {resetOpen?.email}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Новый пароль</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <p className="mt-1 text-xs text-slate-500">{PASSWORD_MIN_LENGTH_HINT}</p>
            {isWeakPassword(resetPassword) ? (
              <p className="mt-1 text-xs text-amber-700">{PASSWORD_WEAK_HINT}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(null)}>
              Отмена
            </Button>
            <Button onClick={() => void handleReset()}>Сбросить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
