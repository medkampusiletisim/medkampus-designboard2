import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  XCircle,
  Clock,
  Wallet,
  ArrowUpRight,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient-neon mb-2">
            MedKampüs Paneli
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Sistem Durumu ve Finansal Özet (Son 30 Gün)
          </p>
        </div>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Balance / Net Profit Card - Hero */}
        <div className="col-span-1 md:col-span-2 card-vibrant rounded-2xl p-6 shadow-xl relative glow-md">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium opacity-90 uppercase tracking-widest mb-1">
                Net Kâr (Son 30 Gün)
              </p>
              {statsLoading ? (
                <Skeleton className="h-10 w-40 bg-white/20" />
              ) : (
                <div className="text-5xl font-bold tracking-tighter">
                  {parseFloat(stats?.monthlyNetProfit || "0").toLocaleString("tr-TR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} ₺
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-75">Ciro</p>
                <div className="text-xl font-semibold">
                  {parseFloat(stats?.monthlyRevenue || "0").toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
              <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Regular Metrics */}
        <div className="grid grid-rows-2 gap-4 col-span-1">
          <div className="glass-card rounded-xl p-4 flex flex-col justify-center glow-sm hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Aktif Koçlar</span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.activeCoaches || 0}
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex flex-col justify-center glow-sm hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Aktif Öğrenciler</span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.activeStudents || 0}
            </div>
          </div>
        </div>

        {/* Pending Payroll */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between glow-sm col-span-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Ödenecek Hakediş</span>
              <Wallet className="w-5 h-5 text-status-away" />
            </div>
            <div className="text-3xl font-bold text-status-away">
              {statsLoading ? <Skeleton className="h-8 w-24" /> :
                `${parseFloat(stats?.pendingPayrollTotal || "0").toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`
              }
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Bekleyen ödemeler (Ayın 28'i)
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Flow Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">Gelir Akışı</h3>
              <p className="text-sm text-muted-foreground">Son 6 Aylık Ciro</p>
            </div>
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
              <TrendingUp className="w-3 h-3 mr-1" /> +12%
            </Badge>
          </div>

          <div className="h-[300px] w-full">
            {historyLoading ? (
              <Skeleton className="h-full w-full opacity-10" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(155, 65%, 50%)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(155, 65%, 50%)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(145, 10%, 20%)" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(145, 10%, 60%)"
                    tickFormatter={(val: string) => val.split(" ")[0]}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(145, 10%, 60%)"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(val: number) => `${val / 1000}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(145, 15%, 15%)' }}
                    contentStyle={{
                      backgroundColor: 'hsl(145, 15%, 8%)',
                      borderColor: 'hsl(145, 10%, 20%)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString("tr-TR")} ₺`, "Tutar"]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#colorRevenue)"
                    radius={[8, 8, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Profit Trend (Area Chart) */}
        <div className="glass-card rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-foreground">Net Kâr Trendi</h3>
            <p className="text-sm text-muted-foreground">Kâr artış grafiği</p>
          </div>

          <div className="h-[300px] w-full">
            {historyLoading ? (
              <Skeleton className="h-full w-full opacity-10" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(175, 60%, 40%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(175, 60%, 40%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(145, 10%, 20%)" />
                  <XAxis dataKey="month" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(145, 15%, 8%)',
                      borderColor: 'hsl(145, 10%, 20%)',
                      color: 'white'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString("tr-TR")} ₺`, "Net Kâr"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="hsl(175, 60%, 50%)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section (Updated Visuals) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`glass-card rounded-2xl p-6 border-l-4 ${expiringAlerts.length > 0 ? 'border-l-status-away' : 'border-l-muted'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-status-away/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-status-away" />
            </div>
            <h3 className="font-semibold text-lg">Yenileme Yaklaşanlar</h3>
          </div>
          <div className="space-y-3">
            {alertsLoading ? <Skeleton className="h-12 w-full" /> :
              expiringAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Yaklaşan yenileme yok.</p>
              ) : (
                expiringAlerts.slice(0, 3).map((alert: RenewalAlert) => (
                  <div key={alert.student.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium">{alert.student.firstName} {alert.student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{alert.student.coach.firstName} {alert.student.coach.lastName}</p>
                    </div>
                    <Badge variant="outline" className="border-status-away text-status-away bg-status-away/5">
                      {alert.daysRemaining} gün
                    </Badge>
                  </div>
                ))
              )
            }
          </div>
        </div>

        <div className={`glass-card rounded-2xl p-6 border-l-4 ${expiredAlerts.length > 0 ? 'border-l-status-busy' : 'border-l-muted'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-status-busy/10 rounded-lg">
              <XCircle className="w-5 h-5 text-status-busy" />
            </div>
            <h3 className="font-semibold text-lg">Süresi Dolanlar</h3>
          </div>
          <div className="space-y-3">
            {alertsLoading ? <Skeleton className="h-12 w-full" /> :
              expiredAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Süresi dolan öğrenci yok.</p>
              ) : (
                expiredAlerts.slice(0, 3).map((alert: RenewalAlert) => (
                  <div key={alert.student.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium">{alert.student.firstName} {alert.student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{alert.student.coach.firstName} {alert.student.coach.lastName}</p>
                    </div>
                    <Badge variant="destructive">
                      {Math.abs(alert.daysRemaining)} gün gecikti
                    </Badge>
                  </div>
                ))
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
