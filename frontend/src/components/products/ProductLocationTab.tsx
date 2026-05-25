import { useCallback, useEffect, useState } from 'react';
import { MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchLots, updateLotLocation } from '../../lib/api/lots';
import type { LotListItem } from '../../types/api';
import { ApiError } from '../../lib/api/client';
import { canEditProduct, type UserRole } from '../../lib/rbac/permissions';

type Props = {
  productId: string;
  userRole: UserRole | null;
  onSaved?: () => void;
};

type LotDraft = {
  location: string;
  saving: boolean;
};

export default function ProductLocationTab({ productId, userRole, onSaved }: Props) {
  const canEdit = canEditProduct(userRole);
  const [lots, setLots] = useState<LotListItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LotDraft>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLots({ productId, pageSize: 100, fefo: true });
      setLots(res.items);
      setDrafts(
        Object.fromEntries(
          res.items.map((lot) => [
            lot.id,
            { location: lot.location ?? '', saving: false },
          ]),
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить ячейки');
      setLots([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDraftLocation = (lotId: string, location: string) => {
    setDrafts((prev) => ({
      ...prev,
      [lotId]: { ...prev[lotId], location },
    }));
  };

  const saveLot = async (lot: LotListItem) => {
    const draft = drafts[lot.id];
    if (!draft) return;

    const nextLocation = draft.location.trim();
    const current = (lot.location ?? '').trim();
    if (nextLocation === current) return;

    setDrafts((prev) => ({
      ...prev,
      [lot.id]: { ...prev[lot.id], saving: true },
    }));

    try {
      const updated = await updateLotLocation(lot.id, {
        location: nextLocation || null,
      });
      setLots((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setDrafts((prev) => ({
        ...prev,
        [lot.id]: { location: updated.location ?? '', saving: false },
      }));
      toast.success(`Ячейка для ${lot.lot} сохранена`);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось сохранить ячейку');
      setDrafts((prev) => ({
        ...prev,
        [lot.id]: { location: lot.location ?? '', saving: false },
      }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-300 rounded p-6 text-sm text-slate-500">
        Загрузка адресов ячеек…
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="bg-white border border-slate-300 rounded p-6 text-sm text-slate-500">
        У товара нет партий с остатком — адрес ячейки задаётся при приёмке или после появления партии.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Адрес ячейки по партиям
        </h3>
      </div>
      <ul className="divide-y divide-slate-200">
        {lots.map((lot) => {
          const draft = drafts[lot.id];
          const dirty =
            draft != null && (draft.location.trim() || '') !== (lot.location ?? '').trim();
          return (
            <li key={lot.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="min-w-[140px] font-mono text-xs font-bold text-slate-700">
                <span className="text-slate-400 font-sans font-semibold mr-1">LOT</span>
                {lot.lot}
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {lot.qty.toLocaleString('ru-RU')} шт
              </div>
              <input
                type="text"
                disabled={!canEdit || draft?.saving}
                placeholder="Напр. A-12-03"
                className="flex-1 min-w-[200px] h-8 px-2 text-sm border border-slate-300 rounded font-mono disabled:bg-slate-50 disabled:text-slate-500"
                value={draft?.location ?? ''}
                onChange={(e) => setDraftLocation(lot.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canEdit && dirty) {
                    void saveLot(lot);
                  }
                }}
              />
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={!dirty || draft?.saving}
                  onClick={() => void saveLot(lot)}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {draft?.saving ? 'Сохранение…' : 'Сохранить'}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {!canEdit && (
        <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-100 bg-slate-50">
          Редактирование доступно ролям с правом изменения номенклатуры.
        </p>
      )}
    </div>
  );
}
