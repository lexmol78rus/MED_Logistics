import { ChevronDown } from 'lucide-react';
import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  applyCategoryLevel,
  CATEGORY_LEVEL_LABELS,
  mergePermissionLayers,
  PERMISSION_LABELS,
  permissionOverrideState,
  ROLE_PERMISSION_DEFAULTS,
  roleTemplateEffectivePermissions,
  setPermissionOverride,
  type CategoryAccessLevel,
  type PermissionCategoryId,
  type PermissionKey,
  type PermissionOverrides,
  type UserRole,
} from '../../lib/rbac/permission-catalog';

const LEVELS: CategoryAccessLevel[] = ['inherit', 'view', 'operate', 'full', 'deny'];

function YesNoBadge({ allowed }: { allowed: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[2.25rem] justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
        allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500',
      )}
    >
      {allowed ? 'да' : 'нет'}
    </span>
  );
}

function AccessCell({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: 'inherit' | 'allow' | 'deny';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mx-auto flex h-8 w-full max-w-[5.5rem] items-center justify-center rounded-md px-1 text-[10px] font-medium leading-tight transition-colors',
        active
          ? tone === 'allow'
            ? 'bg-emerald-600 text-white shadow-sm'
            : tone === 'deny'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-700 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
}

type Props = {
  role: UserRole;
  categoryId: PermissionCategoryId;
  label: string;
  description: string;
  keys: PermissionKey[];
  overrides: PermissionOverrides | null;
  effectiveLevel: CategoryAccessLevel;
  onChange: Dispatch<SetStateAction<PermissionOverrides | null>>;
  inheritBase?: Record<PermissionKey, boolean>;
  levelLabels?: Record<CategoryAccessLevel, string>;
  inheritDetailLabel?: string;
  mode?: 'roleTemplate' | 'user';
  roleTemplate?: PermissionOverrides | null;
};

export function PermissionCategoryRow({
  role,
  categoryId,
  label,
  description,
  keys,
  overrides,
  effectiveLevel,
  onChange,
  inheritBase,
  levelLabels = CATEGORY_LEVEL_LABELS,
  inheritDetailLabel = 'По умолчанию',
  mode = 'roleTemplate',
  roleTemplate = null,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const uniqueKeys = [...new Set(keys)];
  const isUserMode = mode === 'user';
  const templateBase = roleTemplateEffectivePermissions(role, roleTemplate);
  const applyBase = inheritBase ?? templateBase;

  const hasKeyOverrides = uniqueKeys.some((k) => overrides?.[k] !== undefined);

  const setLevel = (level: CategoryAccessLevel) => {
    // «По умолчанию» всегда сбрасывает личные правки раздела (даже если select уже на inherit).
    if (level === 'inherit') {
      onChange((prev) => applyCategoryLevel(role, categoryId, 'inherit', prev, applyBase));
      return;
    }
    if (level === effectiveLevel) return;
    onChange((prev) => applyCategoryLevel(role, categoryId, level, prev, applyBase));
  };

  const personalLabel = isUserMode ? 'Как шаблон' : inheritDetailLabel;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <div className="w-full sm:w-[200px]">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Уровень раздела
          </label>
          <Select
            value={effectiveLevel}
            onValueChange={(v) => setLevel(v as CategoryAccessLevel)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue>{levelLabels[effectiveLevel]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {levelLabels[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasKeyOverrides && effectiveLevel === 'inherit' && (
            <p className="mt-1 text-[10px] text-amber-700">
              Есть личные правки в таблице ниже.{' '}
              <button
                type="button"
                className="font-medium text-violet-700 underline-offset-2 hover:underline"
                onClick={() => setLevel('inherit')}
              >
                Сбросить раздел
              </button>
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDetailOpen((v) => !v)}
        className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50/80"
      >
        <span>Отдельные права ({uniqueKeys.length})</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', detailOpen && 'rotate-180')}
        />
      </button>

      {detailOpen && (
        <div className="border-t border-slate-100">
          <p className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] leading-relaxed text-slate-600">
            {isUserMode ? (
              <>
                <strong>Шаблон роли</strong> — без личных правок.{' '}
                <strong>Как шаблон</strong> — убрать личное отклонение.{' '}
                <strong>Да/Нет</strong> — принудительно для этого сотрудника.
              </>
            ) : (
              <>
                <strong>По умолчанию</strong> — как в системе для роли.{' '}
                <strong>Да/Нет</strong> — зафиксировать в шаблоне роли.
              </>
            )}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 text-left font-medium">Право</th>
                  {isUserMode && (
                    <th className="w-20 px-2 py-2.5 text-center font-medium">Шаблон</th>
                  )}
                  <th className="w-[5.5rem] px-2 py-2.5 text-center font-medium">
                    {personalLabel}
                  </th>
                  <th className="w-14 px-2 py-2.5 text-center font-medium">Да</th>
                  <th className="w-14 px-2 py-2.5 text-center font-medium">Нет</th>
                  <th className="w-16 px-2 py-2.5 text-center font-medium">Итог</th>
                </tr>
              </thead>
              <tbody>
                {uniqueKeys.map((key, index) => {
                  const state = permissionOverrideState(role, key, overrides, applyBase);
                  const templateAllows = templateBase[key] ?? false;
                  const systemAllows = ROLE_PERMISSION_DEFAULTS[role][key] ?? false;
                  const effectiveAllowed = isUserMode
                    ? mergePermissionLayers(role, roleTemplate, overrides)[key] ?? false
                    : (overrides?.[key] !== undefined
                        ? overrides[key]!
                        : applyBase[key] ?? false);
                  const isPersonal = state !== 'inherit';

                  return (
                    <tr
                      key={key}
                      className={cn(
                        'border-b border-slate-100 last:border-0',
                        index % 2 === 1 && 'bg-slate-50/50',
                        isPersonal && 'bg-violet-50/50',
                      )}
                    >
                      <td className="px-4 py-2.5 align-middle">
                        <span className="font-medium text-slate-800">
                          {PERMISSION_LABELS[key] ?? key}
                        </span>
                        {isUserMode && templateAllows !== systemAllows && (
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            в системе для роли: {systemAllows ? 'да' : 'нет'}
                          </span>
                        )}
                      </td>
                      {isUserMode && (
                        <td className="px-2 py-2 text-center align-middle">
                          <YesNoBadge allowed={templateAllows} />
                        </td>
                      )}
                      <td className="px-2 py-2 align-middle">
                        <AccessCell
                          active={state === 'inherit'}
                          tone="inherit"
                          onClick={() =>
                            onChange((prev) =>
                              setPermissionOverride(role, prev, key, 'inherit', applyBase),
                            )
                          }
                        >
                          {personalLabel}
                        </AccessCell>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <AccessCell
                          active={state === 'allow'}
                          tone="allow"
                          onClick={() =>
                            onChange((prev) =>
                              setPermissionOverride(role, prev, key, true, applyBase),
                            )
                          }
                        >
                          Да
                        </AccessCell>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <AccessCell
                          active={state === 'deny'}
                          tone="deny"
                          onClick={() =>
                            onChange((prev) =>
                              setPermissionOverride(role, prev, key, false, applyBase),
                            )
                          }
                        >
                          Нет
                        </AccessCell>
                      </td>
                      <td className="px-2 py-2 text-center align-middle">
                        <YesNoBadge allowed={effectiveAllowed} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
