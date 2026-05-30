import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RoleSelect } from '../components/RoleSelect';
import { PermissionCategoriesEditor } from '../components/settings/PermissionCategoriesEditor';
import { RoleTemplatesPanel } from '../components/settings/RoleTemplatesPanel';
import { settingsCardClass } from '../components/settings/settingsStyles';
import { ApiError } from '../lib/api/client';
import {
  fetchUsers,
  updateUser,
  userDisplayName,
  type UserListItem,
} from '../lib/api/users';
import {
  countModifiedTemplateCategories,
  countPermissionOverrides,
  type PermissionOverrides,
  type UserRole,
} from '../lib/rbac/permission-catalog';
import { ROLE_BADGE_CLASS, ROLE_LABELS } from '../lib/rbac/permissions';
import { MAX_PAGE_SIZE } from '../lib/pagination';
import { useRoleTemplatesStore } from '../stores/roleTemplatesStore';
import { useUserStore } from '../stores/userStore';
import { cn } from '@/lib/utils';

type AccessTab = 'users' | 'roles';

export default function AccessSettings() {
  const currentUserId = useUserStore((s) => s.user?.userId);
  const roleTemplates = useRoleTemplatesStore((s) => s.templates);
  const [tab, setTab] = useState<AccessTab>('roles');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>('OPERATOR');
  const [draftPermissions, setDraftPermissions] = useState<PermissionOverrides | null>(null);
  const [savedRole, setSavedRole] = useState<UserRole>('OPERATOR');
  const [savedPermissions, setSavedPermissions] = useState<PermissionOverrides | null>(null);
  const [saving, setSaving] = useState(false);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setUsers(data.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить пользователей');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (tab === 'users') {
      void loadUsers();
    }
  }, [loadUsers, tab]);

  useEffect(() => {
    if (!selectedId && users.length > 0) {
      setSelectedId(users[0].id);
    }
  }, [users, selectedId]);

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  // Подтягиваем права из списка только при смене выбранного пользователя (не при каждом loadUsers).
  useEffect(() => {
    if (!selectedId) {
      syncedUserIdRef.current = null;
      return;
    }
    const user = users.find((u) => u.id === selectedId);
    if (!user) return;
    if (syncedUserIdRef.current === selectedId) return;
    syncedUserIdRef.current = selectedId;
    setDraftRole(user.role);
    setDraftPermissions(user.permissions ?? null);
    setSavedRole(user.role);
    setSavedPermissions(user.permissions ?? null);
  }, [selectedId, users]);

  const dirty =
    draftRole !== savedRole ||
    JSON.stringify(draftPermissions ?? {}) !== JSON.stringify(savedPermissions ?? {});

  const userOverrideCount = countPermissionOverrides(draftPermissions);
  const roleTemplate = roleTemplates?.[draftRole] ?? null;
  const roleTemplateModifiedSections = countModifiedTemplateCategories(
    draftRole,
    roleTemplate,
  );

  const handleSaveUser = async () => {
    if (!selected) return;
    if (selected.id === currentUserId && draftRole !== savedRole) {
      toast.error('Нельзя менять свою роль на этой странице');
      return;
    }
    setSaving(true);
    try {
      const permissionsToSave =
        draftPermissions == null || Object.keys(draftPermissions).length === 0
          ? null
          : draftPermissions;

      const updated = await updateUser(selected.id, {
        role: draftRole !== savedRole ? draftRole : undefined,
        permissions: permissionsToSave,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      setSavedRole(updated.role);
      setSavedPermissions(updated.permissions ?? null);
      setDraftRole(updated.role);
      setDraftPermissions(updated.permissions ?? null);

      if (selected.id === currentUserId) {
        const me = useUserStore.getState().user;
        if (me) {
          useUserStore.getState().setUser({
            ...me,
            role: updated.role,
            permissions: updated.permissions ?? null,
          });
        }
      }

      toast.success('Права пользователя сохранены');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleResetUserDraft = () => {
    setDraftRole(savedRole);
    setDraftPermissions(savedPermissions);
    toast.message('Изменения отменены');
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 pt-1">
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Link
            to="/settings"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Права доступа
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Сначала настройте шаблон роли для всех сотрудников, затем при необходимости —
              индивидуальные отклонения у конкретных пользователей.
            </p>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('roles')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === 'roles'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Шаблоны ролей
          </button>
          <button
            type="button"
            onClick={() => setTab('users')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5',
              tab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <Users className="h-4 w-4" />
            Пользователи
          </button>
        </div>
      </header>

      {tab === 'roles' && <RoleTemplatesPanel />}

      {tab === 'users' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(240px,280px)_1fr]">
          <aside className={`${settingsCardClass} flex flex-col overflow-hidden`}>
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Поиск по email…"
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <ul className="max-h-[min(70vh,640px)] flex-1 overflow-y-auto p-2">
              {loading && (
                <li className="px-3 py-8 text-center text-xs text-slate-500">Загрузка…</li>
              )}
              {!loading && users.length === 0 && (
                <li className="px-3 py-8 text-center text-xs text-slate-500">
                  Пользователи не найдены
                </li>
              )}
              {!loading &&
                users.map((user) => {
                  const active = user.id === selectedId;
                  const extras = countPermissionOverrides(user.permissions);
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(user.id)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                          active ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate text-sm font-medium text-slate-900">
                          {userDisplayName(user)}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">{user.email}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE_CLASS[user.role]}`}
                          >
                            {ROLE_LABELS[user.role]}
                          </span>
                          {extras > 0 && (
                            <span className="text-[10px] text-violet-600">+{extras} индив.</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            {!selected ? (
              <div className={`${settingsCardClass} p-10 text-center text-sm text-slate-500`}>
                Выберите пользователя слева
              </div>
            ) : (
              <>
                <div className={`${settingsCardClass} p-4 sm:p-5`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {userDisplayName(selected)}
                      </h2>
                      <p className="text-sm text-slate-500">{selected.email}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:w-56">
                      <label className="text-xs font-medium text-slate-600">Роль</label>
                      <RoleSelect
                        value={draftRole}
                        onValueChange={(newRole) => {
                          setDraftRole(newRole);
                          setDraftPermissions(
                            newRole === savedRole ? savedPermissions : null,
                          );
                        }}
                        disabled={selected.id === currentUserId}
                        triggerClassName="h-9 w-full"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <p>
                      Шаблон роли «{ROLE_LABELS[draftRole]}»:{' '}
                      {roleTemplateModifiedSections === 0
                        ? 'как в системе'
                        : `изменено ${roleTemplateModifiedSections} разделов`}
                      .{' '}
                      <button
                        type="button"
                        className="font-medium text-violet-700 underline-offset-2 hover:underline"
                        onClick={() => setTab('roles')}
                      >
                        Править шаблон
                      </button>
                    </p>
                    <p>
                      {userOverrideCount === 0
                        ? 'Личных отклонений у этого пользователя нет.'
                        : `Личных отклонений: ${userOverrideCount}.`}
                      {userOverrideCount > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-7 text-xs"
                          onClick={() => setDraftPermissions(null)}
                        >
                          Сбросить личные
                        </Button>
                      )}
                    </p>
                  </div>
                  {dirty && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetUserDraft}
                        disabled={saving}
                      >
                        Отменить
                      </Button>
                      <Button
                        size="sm"
                        className="bg-violet-700 hover:bg-violet-800"
                        onClick={() => void handleSaveUser()}
                        disabled={saving}
                      >
                        {saving ? 'Сохранение…' : 'Сохранить пользователя'}
                      </Button>
                    </div>
                  )}
                </div>

                <PermissionCategoriesEditor
                  role={draftRole}
                  sparseOverrides={draftPermissions}
                  onChange={setDraftPermissions}
                  mode="user"
                  roleTemplate={roleTemplate}
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
