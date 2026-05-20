import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { getRetryQueueSize } from '../../lib/ops/retry-queue';

export default function ConnectionBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingRetries, setPendingRetries] = useState(0);

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      setPendingRetries(getRetryQueueSize());
    };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    const timer = setInterval(sync, 2000);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      clearInterval(timer);
    };
  }, []);

  if (online && pendingRetries === 0) return null;

  return (
    <div
      className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
        online ? 'bg-amber-600 text-white' : 'bg-red-700 text-white'
      }`}
    >
      <WifiOff className="h-3.5 w-3.5" />
      {!online
        ? 'Нет соединения — операции будут повторены при восстановлении связи'
        : `Ожидают повтора: ${pendingRetries}`}
    </div>
  );
}
