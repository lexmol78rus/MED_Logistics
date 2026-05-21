import { useEffect, useMemo, useState } from 'react';
import { fetchWriteoffDestinations } from '../../lib/api/writeoff-destinations';
import type { WriteoffDestinationItem } from '../../lib/api/writeoff-destinations';
import { ApiError } from '../../lib/api/client';

type Props = {
  value: string;
  onChange: (id: string) => void;
  className?: string;
  selectClassName?: string;
  placeholder?: string;
  disabled?: boolean;
};

export default function DestinationSelect({
  value,
  onChange,
  className = '',
  selectClassName = '',
  placeholder = '— Выберите назначение —',
  disabled = false,
}: Props) {
  const [items, setItems] = useState<WriteoffDestinationItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchWriteoffDestinations({ activeOnly: true, pageSize: 200 });
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить назначения');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => d.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className={className}>
      <input
        type="search"
        className="w-full h-8 mt-1 px-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled || loading}
      />
      <select
        className={`w-full h-9 mt-1 px-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 ${selectClassName}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Загрузка…' : placeholder}</option>
        {filtered.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
      {!loading && filtered.length === 0 && !error && (
        <p className="text-[10px] text-slate-500 mt-1">Нет активных назначений</p>
      )}
    </div>
  );
}
