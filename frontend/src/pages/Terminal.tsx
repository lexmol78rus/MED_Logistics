import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Package,
  LogOut,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { processScanner } from '../lib/api/scanner';
import { receiveInventory, fetchWriteoffRecommendation, writeoffInventory } from '../lib/api/inventory';
import { useScannerField } from '../lib/scanner/useScannerField';
import { ApiError } from '../lib/api/client';
import { enqueueRetry } from '../lib/ops/retry-queue';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import { canReceive, canWriteoff } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';

type TerminalMode = 'receive' | 'writeoff' | 'lot' | 'product';

export default function Terminal() {
  const navigate = useNavigate();
  const role = useUserStore((s) => s.user?.role ?? null);
  const [mode, setMode] = useState<TerminalMode>('receive');
  const [scanValue, setScanValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [qty, setQty] = useState('1');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingWriteoff, setPendingWriteoff] = useState<{ lotId: string; quantity: number } | null>(
    null,
  );

  const showStatus = (ok: boolean, msg: string) => {
    setStatus(ok ? 'ok' : 'err');
    setMessage(msg);
    setTimeout(() => setStatus('idle'), 2500);
  };

  const handleScan = async (value: string) => {
    setScanValue(value);
    try {
      const result = await processScanner(value);
      if (!result.found) {
        showStatus(false, 'Код не найден');
        return;
      }

      if (mode === 'lot' && result.lot) {
        navigate(`/lots?search=${encodeURIComponent(result.lot.lotNumber)}`);
        showStatus(true, `Партия ${result.lot.lotNumber}`);
        return;
      }

      if (mode === 'product' && result.product) {
        navigate(`/products/${result.product.id}`);
        showStatus(true, result.product.name);
        return;
      }

      if (result.product) {
        setProductId(result.product.id);
        showStatus(true, `${result.product.name} (${result.product.ref})`);
      }
    } catch (err) {
      showStatus(false, err instanceof ApiError ? err.message : 'Ошибка сканирования');
    }
  };

  const { inputRef, handleKeyDown, restoreFocus } = useScannerField({
    onScan: handleScan,
    enabled: true,
  });

  const submitReceive = async () => {
    if (!canReceive(role)) {
      showStatus(false, 'Нет прав на приёмку');
      return;
    }
    if (!productId || !lotNumber || !expiryDate) {
      showStatus(false, 'Сканируйте товар и укажите партию/срок');
      return;
    }
    const run = async () => {
      await receiveInventory({
        productId,
        lotNumber: lotNumber.toUpperCase(),
        expiryDate,
        quantity: Number(qty) || 1,
      });
      showStatus(true, 'Приёмка выполнена');
      setLotNumber('');
      setExpiryDate('');
      setProductId(null);
      setScanValue('');
      restoreFocus();
    };
    try {
      await run();
    } catch (err) {
      if (!navigator.onLine) {
        enqueueRetry('Приёмка', run);
        showStatus(false, 'Офлайн — в очереди на повтор');
        return;
      }
      showStatus(false, err instanceof ApiError ? err.message : 'Ошибка приёмки');
    }
  };

  const prepareWriteoff = async () => {
    if (!canWriteoff(role)) {
      showStatus(false, 'Нет прав на списание');
      return;
    }
    const q = scanValue.trim();
    if (!q && !productId) {
      showStatus(false, 'Сканируйте товар');
      return;
    }
    try {
      const rec = await fetchWriteoffRecommendation({
        productId: productId ?? undefined,
        q: q || undefined,
      });
      const fefo = rec.lots.find((l) => l.fefo);
      if (!fefo) {
        showStatus(false, 'Нет доступных партий');
        return;
      }
      setPendingWriteoff({ lotId: fefo.lotId, quantity: Number(qty) || 1 });
      setConfirmOpen(true);
    } catch (err) {
      showStatus(false, err instanceof ApiError ? err.message : 'Ошибка FEFO');
    }
  };

  const confirmWriteoff = async () => {
    if (!pendingWriteoff || !productId) return;
    setConfirmOpen(false);
    const run = async () => {
      await writeoffInventory({
        productId,
        lines: [pendingWriteoff],
      });
      showStatus(true, 'Списание выполнено');
      setPendingWriteoff(null);
      restoreFocus();
    };
    try {
      await run();
    } catch (err) {
      if (!navigator.onLine) {
        enqueueRetry('Списание', run);
        showStatus(false, 'Офлайн — в очереди');
        return;
      }
      showStatus(false, err instanceof ApiError ? err.message : 'Ошибка списания');
    }
  };

  const modes: { id: TerminalMode; label: string; icon: typeof Package }[] = [
    { id: 'receive', label: 'Приёмка', icon: ArrowDownToLine },
    { id: 'writeoff', label: 'Списание', icon: ArrowUpFromLine },
    { id: 'lot', label: 'Партия', icon: Boxes },
    { id: 'product', label: 'Товар', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <h1 className="text-lg font-bold tracking-tight">ТСД — Терминал склада</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Enter / сканер</p>
        </div>
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-xs font-bold uppercase text-slate-400 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Выход
        </Link>
      </header>

      <div className="grid grid-cols-4 gap-2 p-3">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`flex flex-col items-center gap-1 py-4 rounded-lg border-2 text-sm font-bold uppercase ${
              mode === m.id
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}
          >
            <m.icon className="h-6 w-6" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="px-3 flex-1 flex flex-col gap-3">
        <div
          className={`rounded-lg border-2 px-3 py-2 flex items-center gap-2 min-h-[3rem] ${
            status === 'ok'
              ? 'border-emerald-500 bg-emerald-950'
              : status === 'err'
                ? 'border-red-500 bg-red-950'
                : 'border-slate-600 bg-slate-800'
          }`}
        >
          {status === 'ok' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
          {status === 'err' && <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
          <span className="text-sm font-mono">{message || 'Ожидание скана...'}</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Штрихкод / REF / LOT..."
          className="w-full h-14 px-4 text-xl font-mono font-bold bg-slate-900 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoFocus
        />

        {(mode === 'receive' || mode === 'writeoff') && (
          <>
            <input
              type="text"
              placeholder="Номер партии"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="h-12 px-3 text-lg font-mono bg-slate-900 border border-slate-600 rounded-lg"
            />
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-12 px-3 text-lg bg-slate-900 border border-slate-600 rounded-lg"
            />
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-12 px-3 text-lg font-mono bg-slate-900 border border-slate-600 rounded-lg"
            />
          </>
        )}

        {mode === 'receive' && (
          <Button
            type="button"
            className="h-16 text-lg font-bold uppercase bg-emerald-600 hover:bg-emerald-500"
            onClick={() => void submitReceive()}
          >
            Принять (Enter)
          </Button>
        )}
        {mode === 'writeoff' && (
          <Button
            type="button"
            className="h-16 text-lg font-bold uppercase bg-red-600 hover:bg-red-500"
            onClick={() => void prepareWriteoff()}
          >
            Списать FEFO
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Подтвердить списание"
        message={`Списать ${pendingWriteoff?.quantity ?? 0} ед. по FEFO?`}
        confirmLabel="Списать"
        onConfirm={() => void confirmWriteoff()}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingWriteoff(null);
        }}
      />
    </div>
  );
}
