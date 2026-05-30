import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_LABELS, USER_ROLES, type UserRole } from '../lib/rbac/permissions';

type Props = {
  value: UserRole;
  onValueChange: (role: UserRole) => void;
  disabled?: boolean;
  triggerClassName?: string;
  placeholder?: string;
};

/** Выбор роли с русскими подписями в закрытом поле и в списке. */
export function RoleSelect({
  value,
  onValueChange,
  disabled,
  triggerClassName,
  placeholder = 'Выберите роль',
}: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as UserRole)}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder}>{ROLE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {USER_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
