export function AuditActorCell({ name, email }: { name: string; email: string | null }) {
  const displayName = name?.trim() || 'Система';
  const showEmail = !!email?.trim() && email.trim() !== displayName;

  return (
    <div className="audit-actor-cell flex flex-col justify-center gap-0.5 min-w-0 w-full py-0.5">
      <span className="text-xs font-semibold text-slate-800 truncate">
        {displayName}
      </span>
      {showEmail && (
        <span className="text-[10px] text-slate-400 truncate">
          {email}
        </span>
      )}
    </div>
  );
}
