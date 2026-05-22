import { Fragment, useCallback, useEffect, useState } from 'react';
import { PackagePlus, Pencil, XCircle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  cancelExpectedReceipt,
  closeExpectedReceipt,
  createExpectedReceipt,
  fetchExpectedReceipts,
  updateExpectedReceipt,
  type ExpectedReceipt,
  type ExpectedReceiptStatus,
} from '../../lib/api/expected-receipts';
import { ApiError } from '../../lib/api/client';
import { canReceive, type UserRole } from '../../lib/rbac/permissions';
import { TruncatedText } from '../ui/TruncatedText';

const STATUS_COLORS: Record<ExpectedReceiptStatus, string> = {
  ORDERED: 'text-blue-700 bg-blue-50 border-blue-200',
  PARTIALLY_RECEIVED: 'text-amber-700 bg-amber-50 border-amber-200',
  RECEIVED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED: 'text-slate-600 bg-slate-100 border-slate-200',
};

type Props = {
  productId: string;
  userRole: UserRole | null;
};

type FormMode = 'create' | 'edit' | null;

export default function ProductExpectedReceiptsTab({ productId, userRole }: Props) {
  const canEdit = canReceive(userRole);
  const [items, setItems] = useState<ExpectedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchExpectedReceipts({ productId, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить ожидания');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormMode(null);
    setEditingId(null);
    setQty('');
    setComment('');
  };

  const openCreate = () => {
    resetForm();
    setFormMode('create');
  };

  const openEdit = (row: ExpectedReceipt) => {
    if (row.status !== 'ORDERED' && row.status !== 'PARTIALLY_RECEIVED') return;
    setFormMode('edit');
    setEditingId(row.id);
    setQty(String(row.orderedQty));
    setComment(row.comment ?? '');
  };

  const handleSubmit = async () => {
    const orderedQty = Number(qty);
    if (!Number.isFinite(orderedQty) || orderedQty <= 0) {
      toast.error('Укажите корректное количество');
      return;
    }

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await createExpectedReceipt({
          productId,
          orderedQty,
          comment: comment.trim() || undefined,
        });
        toast.success('Ожидание создано');
      } else if (formMode === 'edit' && editingId) {
        await updateExpectedReceipt(editingId, {
          orderedQty,
          comment: comment.trim() || undefined,
        });
        toast.success('Ожидание обновлено');
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closeExpectedReceipt(id);
      toast.success('Ожидание закрыто');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка закрытия');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelExpectedReceipt(id);
      toast.success('Ожидание отменено');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка отмены');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const isActive = (s: ExpectedReceiptStatus) =>
    s === 'ORDERED' || s === 'PARTIALLY_RECEIVED';

  return (
    <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm flex flex-col min-h-[360px]">
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center">
          <PackagePlus className="w-4 h-4 mr-2 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Заказано / ожидается</h3>
        </div>
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700"
            onClick={openCreate}
            disabled={formMode === 'create'}
          >
            <Plus className="w-3 h-3 mr-1" />
            Добавить ожидание
          </Button>
        )}
      </div>

      {formMode && canEdit && (
        <div className="p-4 border-b border-blue-100 bg-blue-50/40 space-y-3">
          <p className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">
            {formMode === 'create' ? 'Новое ожидание' : 'Редактирование'}
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Количество *</label>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1 w-full h-9 px-2 border border-slate-300 rounded font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Комментарий</label>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Больница №56, срочный заказ..."
                className="mt-1 w-full h-9 px-2 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs font-bold"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={resetForm} disabled={submitting}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="p-6 text-xs text-slate-400">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-xs text-slate-400">Нет записей ожидаемого поступления</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
              <tr className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="text-left p-2 pl-3">Статус</th>
                <th className="text-right p-2 w-20">Кол-во</th>
                <th className="text-left p-2">Комментарий</th>
                <th className="text-left p-2 w-28">Дата</th>
                <th className="text-right p-2 w-20">Осталось</th>
                <th className="text-right p-2 pr-3 w-32">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="p-2 pl-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 border rounded text-[8px] uppercase font-bold ${STATUS_COLORS[row.status]}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {row.orderedQty.toLocaleString('ru-RU')}
                      {row.receivedQty > 0 && (
                        <span className="block text-[9px] text-slate-400 font-normal">
                          принято {row.receivedQty.toLocaleString('ru-RU')}
                        </span>
                      )}
                    </td>
                    <td className="p-2 max-w-[240px]">
                      <TruncatedText className="text-slate-700">{row.comment ?? '—'}</TruncatedText>
                    </td>
                    <td className="p-2 text-slate-500 font-mono text-[10px]">{formatDate(row.createdAt)}</td>
                    <td className="p-2 text-right font-mono font-bold text-blue-700">
                      {row.remainingQty.toLocaleString('ru-RU')}
                    </td>
                    <td className="p-2 pr-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button
                          type="button"
                          title="История"
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && isActive(row.status) && (
                          <>
                            <button
                              type="button"
                              title="Редактировать"
                              className="p-1 rounded hover:bg-blue-100 text-blue-600"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Закрыть"
                              className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                              onClick={() => void handleClose(row.id)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Отменить"
                              className="p-1 rounded hover:bg-red-100 text-red-600"
                              onClick={() => void handleCancel(row.id)}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === row.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="text-[9px] font-bold uppercase text-slate-500 mb-2 tracking-wider">
                          История
                        </div>
                        <ul className="space-y-1.5">
                          {row.events.map((ev) => (
                            <li key={ev.id} className="flex items-start gap-2 text-[11px] text-slate-700">
                              <span className="text-slate-400 font-mono shrink-0 w-24">
                                {formatDate(ev.createdAt)}
                              </span>
                              <span className="font-semibold">
                                {ev.typeLabel}
                                {ev.quantity != null ? `: ${ev.quantity.toLocaleString('ru-RU')}` : ''}
                              </span>
                              {ev.message && (
                                <span className="text-slate-500 truncate">— {ev.message}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
