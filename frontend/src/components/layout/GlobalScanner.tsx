import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Terminal, CheckCircle2 } from 'lucide-react';
import { processScanner } from '../../lib/api/scanner';
import { useScannerField } from '../../lib/scanner/useScannerField';
import { ApiError } from '../../lib/api/client';

export default function GlobalScanner() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lastOk, setLastOk] = useState<string | null>(null);

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setNotFound(false);
        return;
      }

      setLoading(true);
      setNotFound(false);
      try {
        const result = await processScanner(trimmed);
        if (!result.found) {
          setNotFound(true);
          setLastOk(null);
          return;
        }

        setValue('');
        setNotFound(false);

        if (result.entityType === 'lot' && result.lot) {
          setLastOk(result.lot.lotNumber);
          navigate(`/lots?search=${encodeURIComponent(result.lot.lotNumber)}`);
          return;
        }

        if (result.product) {
          setLastOk(result.product.ref);
          navigate(`/products/${result.product.id}`);
        }
      } catch {
        setNotFound(true);
        setLastOk(null);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const { inputRef, handleKeyDown, enqueueScan } = useScannerField({
    onScan: runSearch,
  });

  useEffect(() => {
    if (!value.trim()) return;
    const timer = setTimeout(() => enqueueScan(value), 400);
    return () => clearTimeout(timer);
  }, [value, enqueueScan]);

  return (
    <div className="flex items-center flex-1 max-w-2xl">
      <div className="flex items-center flex-1 bg-slate-100 rounded border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-shadow">
        <div className="pl-3 py-1.5 flex items-center text-slate-500 bg-slate-200 border-r border-slate-300 pr-2">
          <Terminal className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 text-nowrap">
            Скан / Поиск:
          </span>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Штрихкод, REF, LOT / Партия..."
          className="w-full px-3 py-1.5 bg-transparent text-sm focus:outline-none font-mono placeholder:font-sans placeholder:text-slate-400 font-bold text-blue-900"
          autoFocus
          disabled={loading}
        />
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600 shrink-0" />}
        {lastOk && !loading && (
          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600 shrink-0" aria-label={lastOk} />
        )}
      </div>
      {notFound && (
        <span className="ml-2 text-[10px] font-bold text-red-600 uppercase whitespace-nowrap">
          Ничего не найдено
        </span>
      )}
    </div>
  );
}
