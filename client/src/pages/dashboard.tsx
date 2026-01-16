import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  TrendingUp,
  Activity,
  AlertTriangle,
  XCircle,
  Zap,
  Cpu,
  Globe,
  Wallet,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { StudentWithCoach } from "@shared/schema";

type EnhancedDashboardStats = {
  activeCoaches: number;
  activeStudents: number;
  expectedMonthlyPayment: string;
  pendingPayrollTotal: string;
  overdueStudentCount: number;
  monthlyRevenue: string;
  monthlyNetProfit: string;
  medkampusCommission: string;
  baseDays: number;
  totalExpense: string;
};

type RenewalAlert = {
  student: StudentWithCoach;
  daysRemaining: number;
  status: "expiring" | "expired";
};

type FinancialHistoryItem = {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<EnhancedDashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: renewalAlerts, isLoading: alertsLoading } = useQuery<RenewalAlert[]>({
    queryKey: ["/api/dashboard/renewal-alerts"],
  });

  const { data: history, isLoading: historyLoading } = useQuery<FinancialHistoryItem[]>({
    queryKey: ["/api/dashboard/analytics", { months: 6 }],
  });

  const expiringAlerts = renewalAlerts?.filter((a) => a.status === "expiring") || [];
  const expiredAlerts = renewalAlerts?.filter((a) => a.status === "expired") || [];

  // Pie Chart Data Calculation
  const revenue = parseFloat(stats?.monthlyRevenue || "0");
  const profit = parseFloat(stats?.monthlyNetProfit || "0");
  const expenses = revenue - profit; // Simplified calc

  const pieData = [
    { name: "Net Kâr", value: profit > 0 ? profit : 0, color: "#00ffff" },
    { name: "Giderler", value: expenses > 0 ? expenses : 0, color: "#bc13fe" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-2">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter text-neon-cyan uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            KOKPİT
          </h1>
          <p className="text-cyan-400/60 flex items-center gap-2 mt-1 font-mono tracking-widest text-xs">
            <Globe className="w-3 h-3" />
            SİSTEM DURUMU VE TELEMETRİ
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-black/40 border-cyan-500/30 text-cyan-400 px-4 py-1 font-mono">
            <Activity className="w-3 h-3 mr-2 animate-pulse" />
            ONLINE
          </Badge>
          <div className="text-xs text-right text-cyan-500/50 font-mono">
            MEDKAMPUS OS v2.4<br />
            SECURE CONNECTION
          </div>
        </div>
      </div>

      {/* Hero KPIs - Holographic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Main Revenue Display */}
        <div className="col-span-1 md:col-span-2 hud-panel hud-corners rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-48 h-48 text-cyan-500" />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                <span className="text-xs font-bold text-cyan-500 tracking-[0.2em] uppercase">Net Kâr (30 Gün)</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-16 w-64 bg-cyan-900/20" />
              ) : (
                <div className="text-6xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                  {Math.floor(profit).toLocaleString('tr-TR')}
                  <span className="text-3xl text-cyan-500/70 ml-2">₺</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center gap-8 border-t border-cyan-500/20 pt-4">
              <div>
                <div className="text-xs text-cyan-500/60 uppercase tracking-wider mb-1">Toplam Ciro</div>
                <div className="text-xl font-mono text-cyan-300">
                  {revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
              <div>
                <div className="text-xs text-cyan-500/60 uppercase tracking-wider mb-1">Büyüme</div>
                <div className="text-xl font-mono text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> +12.4%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Small Metrics */}
        <div className="grid grid-rows-2 gap-4 col-span-1">
          {/* Active Coaches */}
          <div className="hud-panel rounded-lg p-5 flex items-center justify-between hover:bg-cyan-900/10 transition-colors cursor-pointer group">
            <div>
              <p className="text-xs text-cyan-500/70 uppercase tracking-wider mb-1 group-hover:text-cyan-400">Aktif Koçlar</p>
              <div className="text-3xl font-bold text-white font-mono">
                {statsLoading ? "_" : stats?.activeCoaches}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Active Students */}
          <div className="hud-panel rounded-lg p-5 flex items-center justify-between hover:bg-purple-900/10 transition-colors cursor-pointer group">
            <div>
              <p className="text-xs text-purple-400/70 uppercase tracking-wider mb-1 group-hover:text-purple-300">Aktif Öğrenciler</p>
              <div className="text-3xl font-bold text-white font-mono">
                {statsLoading ? "_" : stats?.activeStudents}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30 group-hover:border-purple-400 group-hover:shadow-[0_0_15px_rgba(188,19,254,0.3)] transition-all">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Payroll Pending */}
        <div className="hud-panel rounded-xl p-6 relative overflow-hidden bg-gradient-to-br from-black/60 to-orange-900/20 border-orange-500/30 border">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <AlertTriangle className="w-24 h-24 text-orange-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">ÖDEME BEKLEYEN</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2 font-mono">
              {statsLoading ? "..." : parseFloat(stats?.pendingPayrollTotal || "0").toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
            </div>
            <div className="h-1 w-full bg-orange-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 w-[65%] shadow-[0_0_10px_orange]"></div>
            </div>
            <p className="text-xs text-orange-400/60 mt-2 font-mono">DÖNGÜ: 28 GÜN KALDI</p>
          </div>
        </div>
      </div>

      {/* Advanced Telemetry (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Chart */}
        <div className="lg:col-span-2 hud-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Gelir Spektrumu
            </h3>
            <Badge variant="outline" className="bg-cyan-900/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 cursor-pointer">
              SON 6 AY
            </Badge>
          </div>

          <div className="h-[350px] w-full">
            {historyLoading ? (
              <Skeleton className="h-full w-full bg-cyan-900/10" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(0, 255, 255, 0.5)"
                    tickFormatter={(val) => val.split(" ")[0]}
                    tick={{ fill: 'rgba(0, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Rajdhani' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="rgba(0, 255, 255, 0.5)"
                    tickFormatter={(val) => `${val / 1000}k`}
                    tick={{ fill: 'rgba(0, 255, 255, 0.7)', fontSize: 12, fontFamily: 'Rajdhani' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(0,255,255,0.3)', color: '#fff' }}
                    itemStyle={{ color: '#00ffff' }}
                    labelStyle={{ color: '#aaa', marginBottom: '5px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#bc13fe"
                    strokeWidth={2}
                    fill="transparent"
                    name="Ciro"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#00ffff"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    name="Net Kâr"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart / Distribution */}
        <div className="hud-panel rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-bold text-neon-purple uppercase tracking-widest mb-6 border-b border-purple-500/20 pb-4">
            Finansal Dağılım
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {/* Center Tech Ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 rounded-full border border-dashed border-cyan-500/30 animate-spin-slow"></div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(188, 19, 254, 0.3)', color: '#fff' }}
                  formatter={(value: number) => `${value.toLocaleString('tr-TR')} ₺`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded bg-cyan-900/10 border border-cyan-500/20">
              <div className="text-xs text-cyan-500/70 uppercase">Net Kâr</div>
              <div className="text-lg font-bold text-white">{revenue > 0 ? Math.floor((profit / revenue) * 100) : 0}%</div>
            </div>
            <div className="text-center p-3 rounded bg-purple-900/10 border border-purple-500/20">
              <div className="text-xs text-purple-500/70 uppercase">Gider</div>
              <div className="text-lg font-bold text-white">{revenue > 0 ? Math.ceil((expenses / revenue) * 100) : 0}%</div>
            </div>
          </div>
        </div>

      </div>

      {/* Alerts - Styled as System Warnings */}
      <div className="hud-panel rounded-xl overflow-hidden">
        <div className="bg-red-950/30 p-3 border-b border-red-500/20 flex items-center justify-between">
          <h3 className="text-red-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Kritik Bildirimler
          </h3>
          <span className="text-xs text-red-400/50 font-mono">SYSTEM_ALERT_LEVEL_1</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alertsLoading ? (
            <Skeleton className="h-12 w-full bg-red-900/10" />
          ) : [...expiringAlerts, ...expiredAlerts].length === 0 ? (
            <div className="col-span-full text-center py-6 text-emerald-500/50 font-mono text-sm">
              TÜM SİSTEMLER NORMAL. BİLDİRİM YOK.
            </div>
          ) : (
            [...expiringAlerts, ...expiredAlerts].slice(0, 6).map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-900/5 border border-red-500/10 rounded hover:bg-red-900/10 transition-colors">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-sm font-bold text-red-200">{alert.student.firstName} {alert.student.lastName}</div>
                    <div className="text-xs text-red-500/50 font-mono">{alert.student.coach.firstName} {alert.student.coach.lastName}</div>
                  </div>
                </div>
                <Badge variant="destructive" className="bg-red-950 text-red-500 border-red-900 font-mono">
                  {alert.daysRemaining < 0 ? `-${Math.abs(alert.daysRemaining)} GÜN` : `${alert.daysRemaining} GÜN`}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
