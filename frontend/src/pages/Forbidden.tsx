import { Link, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function Forbidden() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldOff className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Недостаточно прав</h1>
        <p className="text-sm text-slate-600">
          У вашей учётной записи нет доступа к этому разделу
          {from ? ` (${from})` : ''}.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700"
        >
          На панель управления
        </Link>
      </div>
    </div>
  );
}
