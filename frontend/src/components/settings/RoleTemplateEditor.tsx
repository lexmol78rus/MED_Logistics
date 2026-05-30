import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  countModifiedTemplateCategories,
  type PermissionOverrides,
  type UserRole,
} from '../../lib/rbac/permission-catalog';
import { RoleTemplatePermissionsList } from './RoleTemplatePermissionsList';

type Props = {
  role: UserRole;
  template: PermissionOverrides | null;
  onChange: (next: PermissionOverrides | null) => void;
};

export function RoleTemplateEditor({ role, template, onChange }: Props) {
  const modifiedCount = countModifiedTemplateCategories(role, template);

  return (
    <div className="flex flex-col gap-3">
      {modifiedCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-slate-600"
            onClick={() => onChange(null)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Вернуть всё по умолчанию
          </Button>
        </div>
      )}

      <RoleTemplatePermissionsList role={role} template={template} onChange={onChange} />
    </div>
  );
}
