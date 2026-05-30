import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  applyCategoryLevel,
  categoryEffectiveLevel,
  categoryPermissionItems,
  isCategoryTemplateModified,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSION_DEFAULTS,
  type CategoryAccessLevel,
  type PermissionCategoryId,
  type PermissionOverrides,
  type UserRole,
} from '../../lib/rbac/permission-catalog';

const LEVELS: CategoryAccessLevel[] = ['inherit', 'view', 'operate', 'full', 'deny'];

const LEVEL_LABEL: Record<CategoryAccessLevel, string> = {
  inherit: 'По умолчанию',
  view: 'Только просмотр',
  operate: 'Работа на складе',
  full: 'Полный доступ',
  deny: 'Без доступа',
};

const LEVEL_HINT: Record<CategoryAccessLevel, string> = {
  inherit: 'Без отдельных правил в шаблоне',
  view: 'Открыть разделы, без изменений',
  operate: 'Приёмка, списание, терминал',
  full: 'Все действия в разделе',
  deny: 'Раздел недоступен',
};

type Props = {
  role: UserRole;
  template: PermissionOverrides | null;
  onChange: (next: PermissionOverrides | null) => void;
};

function PermissionChecklist({
  items,
  showDiff,
}: {
  items: ReturnType<typeof categoryPermissionItems>;
  showDiff: boolean;
}) {
  if (items.length === 0) return null;

  const allowedCount = items.filter((i) => i.allowed).length;

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Что включено · {allowedCount} из {items.length}
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => {
          const changed = showDiff && item.allowed !== item.systemDefault;
          return (
            <li
              key={item.key}
              className={cn(
                'flex items-start gap-2 rounded-md px-2 py-1.5 text-xs',
                item.allowed ? 'bg-white text-slate-800' : 'text-slate-400',
                changed && 'ring-1 ring-amber-200 bg-amber-50',
              )}
            >
              {item.allowed ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" strokeWidth={2.5} />
              )}
              <span className={cn('leading-snug', !item.allowed && 'line-through decoration-slate-300')}>
                {item.label}
              </span>
              {changed && (
                <span className="ml-auto shrink-0 text-[10px] text-amber-700" title="Отличается от роли">
                  изменено
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RoleTemplatePermissionsList({ role, template, onChange }: Props) {
  const builtin = ROLE_PERMISSION_DEFAULTS[role];
  const [picked, setPicked] = useState<Partial<Record<PermissionCategoryId, CategoryAccessLevel>>>(
    {},
  );

  useEffect(() => {
    setPicked({});
  }, [role]);

  const modifiedCount = useMemo(
    () =>
      PERMISSION_CATEGORIES.filter((c) =>
        isCategoryTemplateModified(role, c.id, template),
      ).length,
    [role, template],
  );

  const displayLevel = (categoryId: PermissionCategoryId): CategoryAccessLevel => {
    if (picked[categoryId]) return picked[categoryId]!;
    if (!isCategoryTemplateModified(role, categoryId, template)) return 'inherit';
    const eff = categoryEffectiveLevel(role, categoryId, template, builtin);
    return eff === 'inherit' ? 'view' : eff;
  };

  const setLevel = (categoryId: PermissionCategoryId, level: CategoryAccessLevel) => {
    setPicked((prev) => ({ ...prev, [categoryId]: level }));
    onChange(applyCategoryLevel(role, categoryId, level, template, builtin));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-sm text-slate-700">
          {modifiedCount === 0 ? (
            <span>
              Права как у роли в системе. Ниже — полный список по каждому разделу.
            </span>
          ) : (
            <span>
              Изменено разделов: <strong>{modifiedCount}</strong>. Пункты с пометкой «изменено»
              отличаются от роли по умолчанию.
            </span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-600" /> разрешено
          </span>
          <span className="inline-flex items-center gap-1">
            <X className="h-3 w-3 text-slate-300" /> запрещено
          </span>
          <span className="inline-flex items-center gap-1">
            <Minus className="h-3 w-3 text-amber-600" /> отличается от роли
          </span>
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {PERMISSION_CATEGORIES.map((cat) => {
          const modified = isCategoryTemplateModified(role, cat.id, template);
          const level = displayLevel(cat.id);
          const items = categoryPermissionItems(role, cat.id, template);

          return (
            <li
              key={cat.id}
              className={cn('px-4 py-4', modified && 'bg-amber-50/30')}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{cat.label}</h3>
                    {modified && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        свой шаблон
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{cat.description}</p>
                </div>

                <div className="w-full shrink-0 sm:w-[240px]">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Уровень
                  </label>
                  <Select
                    value={level}
                    onValueChange={(v) => setLevel(cat.id, v as CategoryAccessLevel)}
                  >
                    <SelectTrigger className="h-10 w-full bg-white">
                      <SelectValue>{LEVEL_LABEL[level]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l} className="py-2">
                          <span className="block font-medium">{LEVEL_LABEL[l]}</span>
                          <span className="block text-[11px] text-slate-500">{LEVEL_HINT[l]}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <PermissionChecklist items={items} showDiff={modified} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
