import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import { ApiError } from '../lib/api/client';
import {
  createCounterparty,
  deleteCounterparty,
  fetchCounterparties,
  updateCounterparty,
  type Counterparty,
} from '../lib/api/counterparties';

function normalizeInn(value: string) {
  return value.replace(/\D/g, '').slice(0, 12);
}

export default function LegalEntities() {
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

  const [deleteTarget, setDeleteTarget] = useState<Counterparty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchCounterparties('LEGAL_ENTITY', q.trim() || undefined);
      setItems(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить юрлица');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setCreateFullName('');
    setCreateShortName('');
    setCreateInn('');
    setCreateOpen(true);
  };

  const closeCreate = () => {
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
        type: 'LEGAL_ENTITY',
        name: shortName,
        ...(fullName ? { fullName } : {}),
        ...(inn ? { inn } : {}),
      });
      toast.success('Юр. лицо создано');
      await load();
      closeCreate();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось создать');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = (c: Counterparty) => {
    setEditing(c);
    setEditFullName(c.fullName ?? '');
    setEditShortName(c.name ?? '');
    setEditInn(c.inn ?? '');
    setEditOpen(true);
  };

  const closeEdit = () => {
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
      toast.success('Юр. лицо обновлено');
      await load();
      closeEdit();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось обновить');
    } finally {
      setEditSaving(false);
    }
  };

  const requestDelete = (c: Counterparty) => {
    setDeleteTarget(c);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteCounterparty(deleteTarget.id)
      .then((res) => {
        const parts: string[] = ['Юр. лицо удалено'];
        if (res.detachedShipments > 0) parts.push(`отгрузок без юр. лица: ${res.detachedShipments}`);
        toast.success(parts.join(' · '));
        if (editing?.id === deleteTarget.id) closeEdit();
        setDeleteTarget(null);
        return load();
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Юр. лица</h1>
          <p className="text-xs text-slate-500">База юридических лиц, от лица которых осуществляется отгрузка (пока без логики/привязок)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={openCreate}>
            Добавить юр. лицо
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()}>
            {loading ? 'Обновление...' : 'Обновить'}
          </Button>
        </div>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b bg-slate-50">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
            placeholder="Поиск (полное/краткое/ИНН)"
            className="w-full h-9 border border-slate-200 rounded px-2 text-sm"
          />
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
                <TableHead className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[35%]">
                  Полное наименование
                </TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[27%]">
                  Краткое
                </TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right w-[16%]">
                  ИНН
                </TableHead>
                <TableHead className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right w-[22%] min-w-[11rem]">
                  Действия
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((x) => (
                <TableRow key={x.id} className="text-sm">
                  <TableCell className="px-3 py-2.5 align-middle whitespace-normal max-w-0">
                    <div className="text-slate-900 truncate" title={x.fullName || ''}>
                      {x.fullName || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle whitespace-normal max-w-0">
                    <div className="font-semibold text-slate-900 truncate" title={x.name}>
                      {x.name}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-right font-mono text-xs tabular-nums text-slate-700">
                    {x.inn || '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 text-[10px] font-semibold"
                        onClick={() => openEdit(x)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 shrink-0 text-[10px] font-semibold"
                        onClick={() => requestDelete(x)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {items.length === 0 && (
            <div className="p-4 text-sm text-slate-600 border-t">{loading ? 'Загрузка...' : 'Пока нет юрлиц'}</div>
          )}
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeCreate}
            disabled={createSaving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-legal-entity-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <h3 id="create-legal-entity-title" className="text-sm font-bold text-slate-900">
                Новое юр. лицо
              </h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                onClick={closeCreate}
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
                  placeholder="Например: ООО «МедЛогистика»"
                  disabled={createSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Сокращённое наименование *</label>
                <input
                  value={createShortName}
                  onChange={(e) => setCreateShortName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Как будет отображаться в списках"
                  disabled={createSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">ИНН</label>
                <input
                  value={createInn}
                  onChange={(e) => setCreateInn(normalizeInn(e.target.value))}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="10 или 12 цифр"
                  inputMode="numeric"
                  disabled={createSaving}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeCreate} disabled={createSaving}>
                Отмена
              </Button>
              <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={() => void submitCreate()} disabled={createSaving}>
                {createSaving ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Удалить юр. лицо?"
        message={
          deleteTarget
            ? `Будет удалено «${deleteTarget.name}». Отгрузки в архиве останутся в системе, но без привязки к этому юр. лицу. Удаление невозможно, если есть активные отгрузки (новые, в сборке или ожидают списания).`
            : ''
        }
        confirmLabel="Удалить"
        confirmDisabled={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {editOpen && editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeEdit}
            disabled={editSaving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-legal-entity-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <h3 id="edit-legal-entity-title" className="text-sm font-bold text-slate-900">
                Редактирование юр. лица
              </h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                onClick={closeEdit}
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
                  onChange={(e) => setEditInn(normalizeInn(e.target.value))}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  inputMode="numeric"
                  disabled={editSaving}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeEdit} disabled={editSaving}>
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

