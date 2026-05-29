import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { suggestProductNames, type ProductNameCatalogItem } from '../../lib/api/product-names';
import { ApiError } from '../../lib/api/client';

export type ProductNamePick = {
  name: string;
  manufacturer: string | null;
};

type ProductNameAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  onPick?: (pick: ProductNamePick) => void;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
};

export default function ProductNameAutocomplete({
  id,
  value,
  onChange,
  onPick,
  placeholder = 'Введите название',
  disabled,
  inputRef: externalRef,
  className,
}: ProductNameAutocompleteProps) {
  const listId = useId();
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const wrapRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductNameCatalogItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const loadSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const items = await suggestProductNames(q, 12);
      setSuggestions(items);
      setOpen(items.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setSuggestions([]);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSuggestions(value);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value, loadSuggestions]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (item: ProductNameCatalogItem) => {
    onChange(item.name);
    onPick?.({ name: item.name, manufacturer: item.manufacturer });
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !suggestions.length) {
      if (event.key === 'ArrowDown' && value.trim().length >= 2) {
        void loadSuggestions(value).then(() => setOpen(true));
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pick(suggestions[activeIndex]!);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={
          className ??
          'h-9 w-full rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-400">Поиск...</li>
          ) : null}
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                  index === activeIndex ? 'bg-blue-50' : ''
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                <span className="block font-medium text-slate-800">{item.name}</span>
                {item.manufacturer ? (
                  <span className="block text-[10px] text-slate-500">{item.manufacturer}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
