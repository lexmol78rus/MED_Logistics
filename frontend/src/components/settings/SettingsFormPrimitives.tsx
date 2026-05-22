import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  settingsCheckboxClass,
  settingsInputClass,
} from './settingsStyles';

export function SettingsToggleRow({
  checked,
  onChange,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50',
        className,
      )}
    >
      <input
        type="checkbox"
        className={cn(settingsCheckboxClass, 'mt-0.5')}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function SettingsNumberField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  id?: string;
}) {
  const fieldId = id ?? label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        id={fieldId}
        type="number"
        className={settingsInputClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function SettingsFieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-slate-600">
      {children}
    </label>
  );
}
