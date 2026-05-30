import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RoleSelect } from '../RoleSelect';
import { RoleTemplateEditor } from './RoleTemplateEditor';
import { settingsCardClass } from './settingsStyles';
import { ApiError } from '../../lib/api/client';
import { updateRolePermissionTemplate } from '../../lib/api/role-permissions';
import type { PermissionOverrides, UserRole } from '../../lib/rbac/permission-catalog';
import { ROLE_LABELS } from '../../lib/rbac/permissions';
import { useRoleTemplatesStore } from '../../stores/roleTemplatesStore';

export function RoleTemplatesPanel() {
  const templates = useRoleTemplatesStore((s) => s.templates);
  const setTemplates = useRoleTemplatesStore((s) => s.setTemplates);
  const [selectedRole, setSelectedRole] = useState<UserRole>('ACCOUNTANT');
  const [draft, setDraft] = useState<PermissionOverrides | null>(null);
  const [saved, setSaved] = useState<PermissionOverrides | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fromStore = templates?.[selectedRole] ?? null;
    setDraft(fromStore);
    setSaved(fromStore);
  }, [selectedRole, templates]);

  const dirty = JSON.stringify(draft ?? {}) !== JSON.stringify(saved ?? {});

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateRolePermissionTemplate(selectedRole, draft);
      setTemplates(res.templates);
      setSaved(draft);
      toast.success(`Шаблон роли «${ROLE_LABELS[selectedRole]}» сохранён`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(saved);
    toast.message('Изменения отменены');
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className={`${settingsCardClass} p-4 sm:p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Шаблон роли</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Права для всех сотрудников с этой ролью. В каждом разделе выберите уровень из списка.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:w-56">
            <label className="text-xs font-medium text-slate-600">Роль</label>
            <RoleSelect
              value={selectedRole}
              onValueChange={setSelectedRole}
              triggerClassName="h-9 w-full"
            />
          </div>
        </div>
      </div>

      {dirty && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Отменить
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-violet-700 hover:bg-violet-800"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Сохранение…' : 'Сохранить шаблон'}
          </Button>
        </div>
      )}

      <RoleTemplateEditor role={selectedRole} template={draft} onChange={setDraft} />
    </div>
  );
}
