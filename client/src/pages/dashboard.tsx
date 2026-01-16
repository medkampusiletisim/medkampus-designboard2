import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  TrendingUp,
  Activity,
  AlertTriangle,
  Zap,
  MoreHorizontal,
  Wallet,
  ArrowUpRight,
  Search,
  Plus,
  CreditCard,
  Bell
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

  const revenue = parseFloat(stats?.monthlyRevenue || "0");
  const profit = parseFloat(stats?.monthlyNetProfit || "0");
  const expenses = revenue - profit;

  const pieData = [
    { name: "Net Kâr", value: profit > 0 ? profit : 0, color: "#00ffff" }, // Neon Cyan
    { name: "Giderler", value: expenses > 0 ? expenses : 0, color: "#7c3aed" }, // Purply
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-2 max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">KOKPİT</h1>
          <p className="text-gray-400 text-sm mt-1">Hoş Geldiniz, Yönetici</p>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-400 transition-colors" />
            <Input
              placeholder="Arama..."
              className="pl-12 h-12 input-glass w-full"
            />
          </div>
          <Button size="icon" className="h-12 w-12 rounded-xl bg-black/40 border border-white/5 hover:bg-white/10 text-white relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </Button>
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
            MK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column (Hero & Stats) */}
        <div className="lg:col-span-2 space-y-8">

          {/* HERO CARD & Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Hero Card */}
            <div className="md:col-span-2 hero-card-gradient rounded-[30px] p-8 relative overflow-hidden group">
              {/* Decorative 3D Elements */}
              <div className="absolute right-[-20px] top-[-20px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-700">
                <Zap className="w-64 h-64 text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)] rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 backdrop-blur-md">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-emerald-400 font-medium tracking-wide text-sm uppercase">Toplam Bakiye</span>
                    </div>
                    {statsLoading ? (
                      <Skeleton className="h-16 w-64 bg-white/10 rounded-xl" />
                    ) : (
                      <h1 className="text-6xl font-bold text-white tracking-tighter drop-shadow-lg">
                        {Math.floor(profit).toLocaleString('tr-TR')}
                        <span className="text-3xl text-emerald-400/80 ml-2 font-normal">₺</span>
                      </h1>
                    )}
                  </div>
                  <div className="hidden md:block">
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-4 py-2 backdrop-blur-md text-sm">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      +12.4% Artış
                    </Badge>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Aylık Ciro</p>
                      <p className="text-xl font-semibold text-white">{revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Bekleyen</p>
                      <p className="text-xl font-semibold text-orange-400">{parseFloat(stats?.pendingPayrollTotal || "0").toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</p>
                    </div>
                  </div>
                  {/* "Add" Button Mockup */}
                  <button className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stat: Active Coaches */}
            <div className="glass-card p-6 flex flex-col justify-between group hover:bg-white/5 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <MoreHorizontal className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white mb-1">{stats?.activeCoaches}</h3>
                <p className="text-gray-400 text-sm">Aktif Profesyonel Koç</p>
              </div>
            </div>

            {/* Quick Stat: Active Students */}
            <div className="glass-card p-6 flex flex-col justify-between group hover:bg-white/5 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <MoreHorizontal className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white mb-1">{stats?.activeStudents}</h3>
                <p className="text-gray-400 text-sm">Aktif Kayıtlı Öğrenci</p>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-white">Gelir Analizi</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white cursor-pointer hover:bg-white/20">Aylık</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 cursor-pointer hover:text-white">Yıllık</span>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {historyLoading ? (
                <Skeleton className="h-full w-full bg-white/5 rounded-2xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} barSize={40}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      tickFormatter={(val) => val.split(" ")[0]}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#0b1210', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="url(#barGradient)"
                      radius={[12, 12, 12, 12]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Donut & Transactions) */}
        <div className="space-y-8">

          {/* Donut Chart */}
          <div className="glass-card p-8 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-white self-start mb-6">Finansal Dağılım</h3>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={20}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-white">{Math.floor((profit / revenue) * 100)}%</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">Kâr Marjı</span>
              </div>
            </div>

            <div className="w-full mt-6 space-y-4">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan]" />
                  <span className="text-sm text-gray-300">Net Kâr</span>
                </div>
                <span className="font-bold text-white">{Math.floor(profit).toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_purple]" />
                  <span className="text-sm text-gray-300">Giderler</span>
                </div>
                <span className="font-bold text-white">{Math.floor(expenses).toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>

          {/* Payments / Transactions List */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg text-white">Bekleyen İşlemler</h3>
              <Badge variant="outline" className="text-orange-400 border-orange-400/30 bg-orange-400/10">3 Adet</Badge>
            </div>

            <div className="space-y-4">
              {expiringAlerts.slice(0, 3).map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{alert.student.firstName} {alert.student.lastName}</p>
                      <p className="text-xs text-gray-400">{alert.daysRemaining} gün kaldı</p>
                    </div>
                  </div>
                </div>
              ))}
              {[1, 2].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Otomatik Tahsilat</p>
                      <p className="text-xs text-gray-400">Spotify Aboneliği</p>
                    </div>
                  </div>
                  <span className="text-white font-medium">-240 ₺</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
