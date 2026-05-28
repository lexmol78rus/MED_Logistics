import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '../lib/api/client';
import {
  createCounterparty,
  fetchCounterparties,
  updateCounterparty,
  type Counterparty,
} from '../lib/api/counterparties';

export default function Suppliers() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Counterparty[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createShortName, setCreateShortName] = useState('');
  const [createInn, setCreateInn] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editing, setEditing] = useState<Counterparty | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editInn, setEditInn] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchCounterparties('SUPPLIER', q.trim() || undefined);
      setItems(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить поставщиков');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setCreateFullName('');
    setCreateShortName('');
    setCreateInn('');
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateSaving(false);
    setCreateFullName('');
    setCreateShortName('');
    setCreateInn('');
  };

  const submitCreate = async () => {
    const shortName = createShortName.trim();
    if (shortName.length < 2) {
      toast.error('Укажите сокращённое наименование (минимум 2 символа)');
      return;
    }
    const fullName = createFullName.trim();
    const inn = createInn.trim();
    if (inn && !/^\d{10}(\d{2})?$/.test(inn)) {
      toast.error('ИНН должен содержать 10 или 12 цифр');
      return;
    }

    setCreateSaving(true);
    try {
      await createCounterparty({
        type: 'SUPPLIER',
        name: shortName,
        ...(fullName ? { fullName } : {}),
        ...(inn ? { inn } : {}),
      });
      toast.success('Поставщик создан');
      await load();
      closeCreateModal();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось создать');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditModal = (c: Counterparty) => {
    setEditing(c);
    setEditFullName(c.fullName ?? '');
    setEditShortName(c.name ?? '');
    setEditInn(c.inn ?? '');
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditSaving(false);
    setEditing(null);
    setEditFullName('');
    setEditShortName('');
    setEditInn('');
  };

  const submitEdit = async () => {
    if (!editing) return;
    const shortName = editShortName.trim();
    if (shortName.length < 2) {
      toast.error('Укажите сокращённое наименование (минимум 2 символа)');
      return;
    }
    const fullName = editFullName.trim();
    const inn = editInn.trim();
    if (inn && !/^\d{10}(\d{2})?$/.test(inn)) {
      toast.error('ИНН должен содержать 10 или 12 цифр');
      return;
    }

    setEditSaving(true);
    try {
      await updateCounterparty(editing.id, {
        name: shortName,
        fullName: fullName || null,
        inn: inn || null,
      });
      toast.success('Поставщик обновлён');
      await load();
      closeEditModal();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось обновить поставщика');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Поставщики</h1>
          <p className="text-xs text-slate-500">Справочник поставщиков</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void load()}>
            {loading ? 'Обновление...' : 'Обновить'}
          </Button>
          <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={openCreateModal}>
            Добавить поставщика
          </Button>
        </div>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b bg-slate-50">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
            placeholder="Поиск (название/ИНН)"
            className="w-full h-9 border border-slate-200 rounded px-2 text-sm"
          />
        </div>
        <div className="divide-y max-h-[70vh] overflow-auto">
          {items.map((c) => (
            <div key={c.id} className="px-3 py-2 text-sm flex items-start justify-between gap-2">
              <div className="min-w-0">
                {c.fullName && c.fullName.trim() && (
                  <div className="text-[11px] text-slate-500 font-medium truncate" title={c.fullName}>
                    {c.fullName}
                  </div>
                )}
                <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                <div className="text-[11px] text-slate-500">ИНН: {c.inn ?? '—'}</div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-semibold" onClick={() => openEditModal(c)}>
                Редактировать
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-4 text-sm text-slate-600">{loading ? 'Загрузка...' : 'Нет поставщиков'}</div>
          )}
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeCreateModal}
            disabled={createSaving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-supplier-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <h3 id="create-supplier-title" className="text-sm font-bold text-slate-900">
                Новый поставщик
              </h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                onClick={closeCreateModal}
                disabled={createSaving}
              >
                Закрыть
              </button>
            </div>

            <div className="px-4 py-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Полное наименование</label>
                <input
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={createSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Сокращённое наименование *</label>
                <input
                  value={createShortName}
                  onChange={(e) => setCreateShortName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={createSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">ИНН</label>
                <input
                  value={createInn}
                  onChange={(e) => setCreateInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  inputMode="numeric"
                  disabled={createSaving}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeCreateModal} disabled={createSaving}>
                Отмена
              </Button>
              <Button
                type="button"
                className="bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => void submitCreate()}
                disabled={createSaving}
              >
                {createSaving ? 'Сохранение...' : 'Создать'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeEditModal}
            disabled={editSaving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-supplier-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <h3 id="edit-supplier-title" className="text-sm font-bold text-slate-900">
                Редактирование поставщика
              </h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                onClick={closeEditModal}
                disabled={editSaving}
              >
                Закрыть
              </button>
            </div>

            <div className="px-4 py-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Полное наименование</label>
                <input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={editSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Сокращённое наименование *</label>
                <input
                  value={editShortName}
                  onChange={(e) => setEditShortName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={editSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">ИНН</label>
                <input
                  value={editInn}
                  onChange={(e) => setEditInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  inputMode="numeric"
                  disabled={editSaving}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeEditModal} disabled={editSaving}>
                Отмена
              </Button>
              <Button
                type="button"
                className="bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => void submitEdit()}
                disabled={editSaving}
              >
                {editSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

