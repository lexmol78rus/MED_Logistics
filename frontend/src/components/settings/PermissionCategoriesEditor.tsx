import type { Dispatch, SetStateAction } from 'react';
import {
  categoryEffectiveLevel,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSION_DEFAULTS,
  roleTemplateEffectivePermissions,
  type CategoryAccessLevel,
  type PermissionOverrides,
  type UserRole,
} from '../../lib/rbac/permission-catalog';
import { PermissionCategoryRow } from './PermissionCategoryRow';

type Props = {
  role: UserRole;
  sparseOverrides: PermissionOverrides | null;
  onChange: Dispatch<SetStateAction<PermissionOverrides | null>>;
  mode: 'roleTemplate' | 'user';
  roleTemplate?: PermissionOverrides | null;
  levelLabels?: Record<CategoryAccessLevel, string>;
  inheritDetailLabel?: string;
};

export function PermissionCategoriesEditor({
  role,
  sparseOverrides,
  onChange,
  mode,
  roleTemplate,
  levelLabels,
  inheritDetailLabel,
}: Props) {
  const inheritBase =
    mode === 'roleTemplate'
      ? ROLE_PERMISSION_DEFAULTS[role]
      : roleTemplateEffectivePermissions(role, roleTemplate ?? null);

  return (
    <div className="space-y-3">
      {PERMISSION_CATEGORIES.map((cat) => (
        <PermissionCategoryRow
          key={cat.id}
          role={role}
          categoryId={cat.id}
          label={cat.label}
          description={cat.description}
          keys={cat.keys}
          overrides={sparseOverrides}
          inheritBase={inheritBase}
          levelLabels={levelLabels}
          inheritDetailLabel={inheritDetailLabel}
          effectiveLevel={categoryEffectiveLevel(
            role,
            cat.id,
            sparseOverrides,
            inheritBase,
          )}
          onChange={onChange}
          mode={mode}
          roleTemplate={roleTemplate}
        />
      ))}
    </div>
  );
}
