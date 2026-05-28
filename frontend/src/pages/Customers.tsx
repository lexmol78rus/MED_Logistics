import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import {
  createCounterparty,
  deleteCounterparty,
  deleteContract,
  fetchContracts,
  fetchContractFileBlob,
  fetchCounterparties,
  updateCounterparty,
  updateContractMeta,
  uploadContract,
  type Contract,
  type Counterparty,
} from '../lib/api/counterparties';
import { ApiError } from '../lib/api/client';

function isoToDashDate(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim().slice(0, 10));
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function dashToIsoDate(value: string): string | null {
  const raw = value.trim();
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isInteger(dd) || !Number.isInteger(mm) || !Number.isInteger(yyyy)) return null;
  if (yyyy < 1900 || yyyy > 2100) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

const CONTRACT_MODAL_INPUT =
  'w-full min-w-0 box-border h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const CONTRACT_MODAL_INPUT_MONO = `${CONTRACT_MODAL_INPUT} font-mono`;
const CONTRACT_MODAL_SPLIT_ROW = 'grid grid-cols-[10.5rem_minmax(0,1fr)] gap-3';

function clampDateParts(parts: { dd?: string; mm?: string; yyyy?: string }) {
  const toNum = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : NaN);
  let dd = toNum(parts.dd);
  let mm = toNum(parts.mm);
  const yyyy = toNum(parts.yyyy);

  if (!Number.isFinite(dd)) dd = 1;
  if (!Number.isFinite(mm)) mm = 1;

  dd = Math.min(Math.max(dd, 1), 31);
  mm = Math.min(Math.max(mm, 1), 12);

  if (Number.isFinite(yyyy)) {
    const daysInMonth = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
    dd = Math.min(dd, daysInMonth);
  }

  return {
    dd: String(dd).padStart(2, '0'),
    mm: String(mm).padStart(2, '0'),
    yyyy: Number.isFinite(yyyy) ? String(yyyy).padStart(4, '0') : parts.yyyy,
  };
}

function normalizeDashDateInput(nextRaw: string): string {
  // Keep only digits, auto-insert dashes as dd-mm-yyyy
  const digits = nextRaw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;

  const rawDd = digits.slice(0, 2);
  const rawMm = digits.length >= 4 ? digits.slice(2, 4) : digits.slice(2);
  const rawYyyy = digits.length > 4 ? digits.slice(4) : '';

  const ddFixed = rawDd.length === 2 ? clampDateParts({ dd: rawDd }).dd : rawDd;
  const mmFixed = rawMm.length === 2 ? clampDateParts({ mm: rawMm }).mm : rawMm;

  if (digits.length <= 4) return `${ddFixed}-${mmFixed}`;
  return `${ddFixed}-${mmFixed}-${rawYyyy}`;
}

export default function Customers() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Counterparty[]>([]);
  const [selected, setSelected] = useState<Counterparty | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNumber, setUploadNumber] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createShortName, setCreateShortName] = useState('');
  const [createInn, setCreateInn] = useState('');

  const [cpEditOpen, setCpEditOpen] = useState(false);
  const [cpEditSaving, setCpEditSaving] = useState(false);
  const [cpEditing, setCpEditing] = useState<Counterparty | null>(null);
  const [cpEditFullName, setCpEditFullName] = useState('');
  const [cpEditShortName, setCpEditShortName] = useState('');
  const [cpEditInn, setCpEditInn] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Counterparty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchCounterparties('CUSTOMER', q.trim() || undefined);
      setItems(res.items);
      if (selected) {
        const fresh = res.items.find((x) => x.id === selected.id) ?? null;
        setSelected(fresh);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить заказчиков');
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async (counterpartyId: string) => {
    setContractsLoading(true);
    try {
      const res = await fetchContracts(counterpartyId);
      setContracts(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить контракты');
    } finally {
      setContractsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected?.id) void loadContracts(selected.id);
  }, [selected?.id]);

  const selectedName = useMemo(() => selected?.name ?? '—', [selected]);

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
      const created = await createCounterparty({
        type: 'CUSTOMER',
        name: shortName,
        ...(fullName ? { fullName } : {}),
        ...(inn ? { inn } : {}),
      });
      toast.success('Заказчик создан');
      await load();
      setSelected(created);
      closeCreateModal();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось создать');
    } finally {
      setCreateSaving(false);
    }
  };

  const openUploadModal = () => {
    if (!selected) {
      toast.message('Выберите заказчика слева');
      return;
    }
    setUploadFile(null);
    setUploadNumber('');
    setUploadDate('');
    setUploadTitle('');
    setUploadOpen(true);
  };

  const closeUploadModal = () => {
    setUploadOpen(false);
    setUploadSaving(false);
    setUploadFile(null);
    setUploadNumber('');
    setUploadDate('');
    setUploadTitle('');
    if (modalFileInputRef.current) modalFileInputRef.current.value = '';
  };

  const submitUploadModal = async () => {
    if (!selected) {
      toast.message('Выберите заказчика слева');
      return;
    }
    if (!uploadFile) {
      toast.error('Выберите файл контракта');
      return;
    }
    const number = uploadNumber.trim();
    if (!number) {
      toast.error('Укажите номер контракта');
      return;
    }
    const dateIso = uploadDate.trim() ? dashToIsoDate(uploadDate.trim()) : null;
    if (uploadDate.trim() && !dateIso) {
      toast.error('Некорректная дата — используйте формат ДД-ММ-ГГГГ');
      return;
    }

    setUploadSaving(true);
    try {
      await uploadContract(selected.id, uploadFile, {
        number,
        ...(dateIso ? { date: dateIso } : {}),
        ...(uploadTitle.trim() ? { title: uploadTitle.trim() } : {}),
      });
      toast.success('Контракт загружен');
      await loadContracts(selected.id);
      closeUploadModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка загрузки контракта');
    } finally {
      setUploadSaving(false);
    }
  };

  const openContract = async (c: Contract) => {
    try {
      const blob = await fetchContractFileBlob(c.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось открыть контракт');
    }
  };

  const openEditModal = (c: Contract) => {
    setEditing(c);
    setEditNumber(c.number ?? '');
    setEditDate(c.date ? isoToDashDate(c.date) : '');
    setEditTitle(c.title ?? '');
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditSaving(false);
    setEditing(null);
    setEditNumber('');
    setEditDate('');
    setEditTitle('');
  };

  const submitEdit = async () => {
    if (!editing) return;
    const number = editNumber.trim();
    if (!number) {
      toast.error('Укажите номер контракта');
      return;
    }
    const dateIso = editDate.trim() ? dashToIsoDate(editDate.trim()) : null;
    if (editDate.trim() && !dateIso) {
      toast.error('Некорректная дата — используйте формат ДД-ММ-ГГГГ');
      return;
    }

    setEditSaving(true);
    try {
      await updateContractMeta(editing.id, {
        number,
        date: dateIso,
        title: editTitle.trim() || null,
      });
      toast.success('Контракт обновлён');
      if (selected?.id) await loadContracts(selected.id);
      closeEditModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось обновить контракт');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteContract = async (c: Contract) => {
    if (!selected) return;
    if (!window.confirm(`Удалить контракт «${c.number}»?`)) return;
    try {
      await deleteContract(c.id);
      toast.success('Контракт удалён');
      await loadContracts(selected.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить контракт');
    }
  };

  const openCounterpartyEdit = () => {
    if (!selected) {
      toast.message('Выберите заказчика слева');
      return;
    }
    setCpEditing(selected);
    setCpEditFullName(selected.fullName ?? '');
    setCpEditShortName(selected.name ?? '');
    setCpEditInn(selected.inn ?? '');
    setCpEditOpen(true);
  };

  const closeCounterpartyEdit = () => {
    setCpEditOpen(false);
    setCpEditSaving(false);
    setCpEditing(null);
    setCpEditFullName('');
    setCpEditShortName('');
    setCpEditInn('');
  };

  const requestDeleteCounterparty = () => {
    if (!selected) {
      toast.message('Выберите заказчика слева');
      return;
    }
    setDeleteTarget(selected);
  };

  const confirmDeleteCounterparty = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteCounterparty(deleteTarget.id)
      .then((res) => {
        const parts: string[] = ['Заказчик удалён'];
        if (res.removedContracts > 0) parts.push(`контрактов: ${res.removedContracts}`);
        if (res.detachedShipments > 0) parts.push(`отгрузок без заказчика: ${res.detachedShipments}`);
        toast.success(parts.join(' · '));
        setDeleteTarget(null);
        setSelected(null);
        setContracts([]);
        return load();
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить заказчика'))
      .finally(() => setDeleting(false));
  };

  const submitCounterpartyEdit = async () => {
    if (!cpEditing) return;
    const shortName = cpEditShortName.trim();
    if (shortName.length < 2) {
      toast.error('Укажите сокращённое наименование (минимум 2 символа)');
      return;
    }
    const fullName = cpEditFullName.trim();
    const inn = cpEditInn.trim();
    if (inn && !/^\d{10}(\d{2})?$/.test(inn)) {
      toast.error('ИНН должен содержать 10 или 12 цифр');
      return;
    }

    setCpEditSaving(true);
    try {
      const updated = await updateCounterparty(cpEditing.id, {
        name: shortName,
        fullName: fullName || null,
        inn: inn || null,
      });
      toast.success('Заказчик обновлён');
      await load();
      setSelected(updated);
      closeCounterpartyEdit();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось обновить заказчика');
    } finally {
      setCpEditSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Заказчики</h1>
          <p className="text-xs text-slate-500">Справочник заказчиков и контракты (храним безопасно в Postgres + uploads)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void load()}>
            {loading ? 'Обновление...' : 'Обновить'}
          </Button>
          <Button type="button" variant="outline" onClick={openCounterpartyEdit} title={!selected ? 'Сначала выберите заказчика слева' : undefined}>
            Редактировать
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!selected}
            onClick={requestDeleteCounterparty}
            title={!selected ? 'Сначала выберите заказчика слева' : undefined}
          >
            Удалить
          </Button>
          <Button type="button" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={openCreateModal}>
            Добавить заказчика
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5 rounded border bg-white overflow-hidden">
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
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                  selected?.id === c.id ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                {c.fullName && c.fullName.trim() && (
                  <div className="text-[11px] text-slate-500 font-medium truncate" title={c.fullName}>
                    {c.fullName}
                  </div>
                )}
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="text-[11px] text-slate-500">ИНН: {c.inn ?? '—'}</div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="p-4 text-sm text-slate-600">{loading ? 'Загрузка...' : 'Нет заказчиков'}</div>
            )}
          </div>
        </div>

        <div className="col-span-7 rounded border bg-white overflow-hidden">
          <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Выбран заказчик</div>
              {selected?.fullName && selected.fullName.trim() && (
                <div className="text-xs text-slate-600 font-medium truncate" title={selected.fullName}>
                  {selected.fullName}
                </div>
              )}
              <div className="text-sm font-bold text-slate-900">{selectedName}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  openUploadModal();
                }}
              >
                Загрузить контракт
              </Button>
            </div>
          </div>

          <div className="px-3 py-2 border-b text-[10px] font-bold uppercase text-slate-500 tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-4">Номер</div>
            <div className="col-span-5">Название</div>
            <div className="col-span-3 text-right">Дата</div>
          </div>
          <div className="divide-y max-h-[70vh] overflow-auto">
            {contracts.map((c) => (
              <div key={c.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <div className="font-mono text-xs text-slate-800 truncate">{c.number}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold"
                    onClick={() => void openContract(c)}
                  >
                    Открыть
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold"
                    onClick={() => openEditModal(c)}
                  >
                    Редактировать
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold text-red-700 border-red-200 hover:bg-red-50"
                    onClick={() => void handleDeleteContract(c)}
                  >
                    Удалить
                  </Button>
                </div>
                <div className="col-span-5 text-slate-900 truncate" title={c.title ?? ''}>
                  {c.title ?? '—'}
                </div>
                <div className="col-span-3 text-right font-mono text-xs text-slate-700">
                  {c.date ? isoToDashDate(c.date) : '—'}
                </div>
              </div>
            ))}
            {selected && contracts.length === 0 && (
              <div className="p-4 text-sm text-slate-600">
                {contractsLoading ? 'Загрузка...' : 'У заказчика пока нет контрактов'}
              </div>
            )}
            {!selected && <div className="p-4 text-sm text-slate-600">Выберите заказчика слева</div>}
          </div>
        </div>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeUploadModal}
            disabled={uploadSaving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-contract-title"
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <div>
                <h3 id="upload-contract-title" className="text-sm font-bold text-slate-900">
                  Загрузка контракта
                </h3>
                <div className="text-[11px] text-slate-600">
                  Заказчик: <span className="font-semibold text-slate-800">{selectedName}</span>
                </div>
              </div>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                onClick={closeUploadModal}
                disabled={uploadSaving}
              >
                Закрыть
              </button>
            </div>

            <div className="min-w-0 px-4 py-4 grid gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="text-[10px] font-bold uppercase text-slate-500">Файл</div>
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept=".docx,.pdf,.html,.htm"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    disabled={uploadSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={uploadSaving}
                  >
                    Выбрать файл
                  </Button>
                  <div className="min-w-0 flex-1 truncate text-xs text-slate-700">
                    {uploadFile ? uploadFile.name : 'Файл не выбран'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">Поддерживаем: .docx, .pdf, .html</div>
              </div>

              <div className="grid gap-1 min-w-0">
                <label className="text-[10px] font-bold uppercase text-slate-500">Номер контракта *</label>
                <input
                  value={uploadNumber}
                  onChange={(e) => setUploadNumber(e.target.value)}
                  className={CONTRACT_MODAL_INPUT_MONO}
                  placeholder="Например 12/24"
                  disabled={uploadSaving}
                />
              </div>

              <div className={CONTRACT_MODAL_SPLIT_ROW}>
                <div className="grid gap-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Дата (ДД-ММ-ГГГГ)</label>
                  <input
                    value={uploadDate}
                    onChange={(e) => setUploadDate(normalizeDashDateInput(e.target.value))}
                    onBlur={() => {
                      const iso = dashToIsoDate(uploadDate);
                      if (iso) {
                        setUploadDate(isoToDashDate(iso));
                        return;
                      }
                      const digits = uploadDate.replace(/\D/g, '');
                      if (digits.length === 8) {
                        const fixed = clampDateParts({
                          dd: digits.slice(0, 2),
                          mm: digits.slice(2, 4),
                          yyyy: digits.slice(4, 8),
                        });
                        const candidate = `${fixed.dd}-${fixed.mm}-${fixed.yyyy ?? ''}`;
                        const fixedIso = dashToIsoDate(candidate);
                        if (fixedIso) setUploadDate(candidate);
                      }
                    }}
                    className={CONTRACT_MODAL_INPUT_MONO}
                    placeholder="28-05-2026"
                    inputMode="numeric"
                    disabled={uploadSaving}
                  />
                </div>
                <div className="grid gap-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Название/тема</label>
                  <input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className={CONTRACT_MODAL_INPUT}
                    placeholder="Необязательно"
                    disabled={uploadSaving}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeUploadModal} disabled={uploadSaving}>
                Отмена
              </Button>
              <Button
                type="button"
                className="bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => void submitUploadModal()}
                disabled={uploadSaving}
              >
                {uploadSaving ? 'Загрузка...' : 'Готово'}
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
            aria-labelledby="edit-contract-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <div>
                <h3 id="edit-contract-title" className="text-sm font-bold text-slate-900">
                  Редактирование контракта
                </h3>
                <div className="text-[11px] text-slate-600">
                  Заказчик: <span className="font-semibold text-slate-800">{selectedName}</span>
                </div>
              </div>
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
              <div className="grid gap-1 min-w-0">
                <label className="text-[10px] font-bold uppercase text-slate-500">Номер контракта *</label>
                <input
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className={CONTRACT_MODAL_INPUT_MONO}
                  disabled={editSaving}
                />
              </div>

              <div className={CONTRACT_MODAL_SPLIT_ROW}>
                <div className="grid gap-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Дата (ДД-ММ-ГГГГ)</label>
                  <input
                    value={editDate}
                    onChange={(e) => setEditDate(normalizeDashDateInput(e.target.value))}
                    onBlur={() => {
                      const iso = dashToIsoDate(editDate);
                      if (iso) {
                        setEditDate(isoToDashDate(iso));
                        return;
                      }
                      const digits = editDate.replace(/\D/g, '');
                      if (digits.length === 8) {
                        const fixed = clampDateParts({
                          dd: digits.slice(0, 2),
                          mm: digits.slice(2, 4),
                          yyyy: digits.slice(4, 8),
                        });
                        const candidate = `${fixed.dd}-${fixed.mm}-${fixed.yyyy ?? ''}`;
                        const fixedIso = dashToIsoDate(candidate);
                        if (fixedIso) setEditDate(candidate);
                      }
                    }}
                    className={CONTRACT_MODAL_INPUT_MONO}
                    placeholder="28-05-2026"
                    inputMode="numeric"
                    disabled={editSaving}
                  />
                </div>
                <div className="grid gap-1 min-w-0">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Название/тема</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={CONTRACT_MODAL_INPUT}
                    placeholder="Необязательно"
                    disabled={editSaving}
                  />
                </div>
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
            aria-labelledby="create-customer-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <h3 id="create-customer-title" className="text-sm font-bold text-slate-900">
                Новый заказчик
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
                  placeholder="Например: ООО «МедТест»"
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
                  onChange={(e) => setCreateInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="10 или 12 цифр"
                  inputMode="numeric"
                  disabled={createSaving}
                />
              </div>
              <div className="text-[11px] text-slate-500">
                В таблицах и поиске будет использоваться <span className="font-semibold">сокращённое</span> наименование.
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

      <ConfirmDialog
        open={deleteTarget != null}
        title="Удалить заказчика?"
        message={
          deleteTarget
            ? `Будет удалён «${deleteTarget.name}» вместе со всеми контрактами. Отгрузки в архиве останутся в системе, но без привязки к заказчику. Удаление невозможно, если есть отгрузки в статусе «Новый» или «Сборка».`
            : ''
        }
        confirmLabel="Удалить"
        confirmDisabled={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCounterparty}
      />

      {cpEditOpen && cpEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeCounterpartyEdit}
            disabled={cpEditSaving}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-customer-title"
            className="relative w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70 rounded-t-lg">
              <h3 id="edit-customer-title" className="text-sm font-bold text-slate-900">
                Редактирование заказчика
              </h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                onClick={closeCounterpartyEdit}
                disabled={cpEditSaving}
              >
                Закрыть
              </button>
            </div>

            <div className="px-4 py-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Полное наименование</label>
                <input
                  value={cpEditFullName}
                  onChange={(e) => setCpEditFullName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={cpEditSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Сокращённое наименование *</label>
                <input
                  value={cpEditShortName}
                  onChange={(e) => setCpEditShortName(e.target.value)}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={cpEditSaving}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">ИНН</label>
                <input
                  value={cpEditInn}
                  onChange={(e) => setCpEditInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  inputMode="numeric"
                  disabled={cpEditSaving}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 rounded-b-lg">
              <Button type="button" variant="outline" onClick={closeCounterpartyEdit} disabled={cpEditSaving}>
                Отмена
              </Button>
              <Button
                type="button"
                className="bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => void submitCounterpartyEdit()}
                disabled={cpEditSaving}
              >
                {cpEditSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

