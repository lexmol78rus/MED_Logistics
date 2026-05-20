import { 
  ArrowRightLeft, 
  PackageSearch, 
  AlertTriangle, 
  Timer, 
  RefreshCcw,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const kpis = [
    { title: 'Total Stock Value', value: '$2.4M', icon: Activity, trend: '+4.2%', trendUp: true },
    { title: 'Products in Stock', value: '4,821', icon: PackageSearch, trend: '-1.4%', trendUp: false },
    { title: 'Expiring < 30 Days', value: '34', icon: Timer, trend: '+12.0%', trendUp: true },
    { title: 'Active Recalls', value: '2', icon: AlertTriangle, trend: 'Critical', trendUp: false, critical: true },
  ];

  const recentMovements = [
    { id: 'MV-0921', type: 'IN', ref: 'REF-8842', desc: 'Surgical Masks L3', qty: '+5000', time: '10 min ago', status: 'completed' },
    { id: 'MV-0920', type: 'OUT', ref: 'REF-1102', desc: 'Saline Solution 500ml', qty: '-240', time: '45 min ago', status: 'completed' },
    { id: 'MV-0919', type: 'WRITE-OFF', ref: 'REF-9931', desc: 'Latex Gloves M', qty: '-50', time: '2 hrs ago', status: 'expired' },
    { id: 'MV-0918', type: 'IN', ref: 'REF-2234', desc: 'Syringes 5ml', qty: '+1000', time: '3 hrs ago', status: 'completed' },
  ];

  const expiringLots = [
    { lot: 'LT-A482X', ref: 'REF-1102', name: 'Saline Solution 500ml', days: 12, qty: 120 },
    { lot: 'LT-B991Y', ref: 'REF-4421', name: 'Painkiller IV 100mg', days: 18, qty: 45 },
    { lot: 'LT-C110Z', ref: 'REF-6632', name: 'Bandages 10cm', days: 24, qty: 890 },
  ];

  return (
    <div className="p-8 pb-12 space-y-6 max-w-7xl mx-auto h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Status</h2>
          <p className="text-muted-foreground mt-1">Live overview of warehouse operations.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">Generate Report</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`bg-white p-4 border rounded-lg shadow-sm ${kpi.critical ? 'border-red-200 border-l-4 border-l-red-500' : 'border-slate-200'}`}>
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider flex items-center justify-between">
              {kpi.title}
              <kpi.icon className={`h-4 w-4 ${kpi.critical ? 'text-red-500' : 'text-slate-400'}`} />
            </div>
            <div className={`text-2xl font-bold ${kpi.critical ? 'text-red-600' : 'text-slate-900'}`}>{kpi.value}</div>
            <div className={`text-[10px] font-medium mt-1 ${kpi.critical ? 'text-slate-500' : (kpi.trendUp ? 'text-emerald-600' : 'text-slate-500')}`}>
              {kpi.critical ? (
                'Action required immediately'
              ) : (
                `${kpi.trend} from last month`
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
            <CardDescription>Stock in/out flow for the current shift.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      movement.type === 'IN' ? 'bg-emerald-500/10 text-emerald-500' :
                      movement.type === 'OUT' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-rose-500/10 text-rose-500'
                    }`}>
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{movement.desc}</p>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground space-x-2">
                        <span className="font-mono">{movement.ref}</span>
                        <span>â¢</span>
                        <span>{movement.id}</span>
                        <span>â¢</span>
                        <span>{movement.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-bold font-mono ${
                      movement.type === 'IN' ? 'text-emerald-500' : 
                      movement.type === 'WRITE-OFF' ? 'text-rose-500' : ''
                    }`}>
                      {movement.qty}
                    </span>
                    {movement.status !== 'completed' && (
                       <Badge variant="destructive" className="mt-1 text-[10px] uppercase h-4 px-1 absolute-translate-fix">{movement.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-white border-slate-200 shadow-sm border-t-2 border-t-red-500">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <Timer className="w-5 h-5 mr-2" />
              Critical Expiries
            </CardTitle>
            <CardDescription>Lots expiring within 30 days requiring action.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiringLots.map((lot) => (
                <div key={lot.lot} className="flex items-center justify-between space-x-4 border-l-2 border-destructive pl-4 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{lot.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {lot.ref} / {lot.lot}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-destructive">
                      {lot.days} Days
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Qty: {lot.qty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6 text-xs" size="sm">
              View All Expiries
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
