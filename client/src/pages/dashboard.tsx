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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type {
  StudentWithCoach,
} from "@shared/schema";

type EnhancedDashboardStats = {
  activeCoaches: number;
  activeStudents: number;
  expectedMonthlyPayment: string;
  pendingPayrollTotal: string;
  overdueStudentCount: number;
  monthlyRevenue: string; // NEW
  monthlyNetProfit: string; // NEW
  medkampusCommission: string; // NEW
  baseDays: number;
};

type RenewalAlert = {
  student: StudentWithCoach;
  daysRemaining: number;
  status: "expiring" | "expired";
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<EnhancedDashboardStats>({
    queryKey: ["/api/dashboard/stats"], // Updated endpoint to match standard
  });

  const { data: renewalAlerts, isLoading: alertsLoading } = useQuery<
    RenewalAlert[]
  >({
    queryKey: ["/api/dashboard/renewal-alerts"],
  });

  const expiringAlerts = renewalAlerts?.filter((a) => a.status === "expiring") || [];
  const expiredAlerts = renewalAlerts?.filter((a) => a.status === "expired") || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">
          MedKampüs Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Sistem özeti ve uyarılar (Son 30 Gün)
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card data-testid="metric-active-coaches">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aktif Koçlar
            </CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-semibold text-foreground">
                {stats?.activeCoaches || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="metric-active-students">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aktif Öğrenciler
            </CardTitle>
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-semibold text-foreground">
                {stats?.activeStudents || 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* REPLACED: Expected Payment -> Monthly Revenue (Ciro) */}
        <Card data-testid="metric-monthly-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-status-online">
              Ciro (Son 30 Gün)
            </CardTitle>
            <DollarSign className="w-5 h-5 text-status-online" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-semibold text-status-online">
                {parseFloat(stats?.monthlyRevenue || "0").toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ₺
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="metric-pending-payroll">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bekleyen Hakediş
            </CardTitle>
            <Wallet className="w-5 h-5 text-status-away" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-semibold text-status-away">
                {parseFloat(stats?.pendingPayrollTotal || "0").toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ₺
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="metric-overdue-students">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gecikmiş Öğrenci
            </CardTitle>
            <Clock className="w-5 h-5 text-status-busy" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <div className="text-3xl font-semibold text-status-busy">
                {stats?.overdueStudentCount || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Paketi bitmiş
            </p>
          </CardContent>
        </Card>

        {/* REPLACED: Cumulative Net Profit -> Monthly Net Profit */}
        <Card data-testid="metric-monthly-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Net Kâr (Son 30 Gün)
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-status-online" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className={`text-3xl font-semibold ${parseFloat(stats?.monthlyNetProfit || "0") >= 0
                  ? "text-status-online"
                  : "text-status-busy"
                  }`}>
                  {parseFloat(stats?.monthlyNetProfit || "0").toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ₺
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Komisyon: {parseFloat(stats?.medkampusCommission || "0").toLocaleString("tr-TR")} ₺
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Renewal Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon */}
        <Alert
          className="border-status-away bg-status-away/5"
          data-testid="alert-expiring"
        >
          <AlertTriangle className="w-5 h-5 text-status-away" />
          <AlertTitle className="text-status-away font-semibold mb-3">
            Paket Yenilemesi Yaklaşanlar
          </AlertTitle>
          <AlertDescription>
            {alertsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : expiringAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Yaklaşan paket yenilemesi bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2">
                {expiringAlerts.slice(0, 5).map((alert) => (
                  <Link
                    key={alert.student.id}
                    href={`/students/${alert.student.id}`}
                  >
                    <div
                      className="flex items-center justify-between p-2 rounded-md hover-elevate cursor-pointer"
                      data-testid={`expiring-student-${alert.student.id}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {alert.student.firstName} {alert.student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Koç: {alert.student.coach.firstName}{" "}
                          {alert.student.coach.lastName}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.daysRemaining} gün kaldı
                      </Badge>
                    </div>
                  </Link>
                ))}
                {expiringAlerts.length > 5 && (
                  <Link href="/students">
                    <p className="text-xs text-primary hover:underline cursor-pointer mt-2">
                      {expiringAlerts.length - 5} öğrenci daha...
                    </p>
                  </Link>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* Expired */}
        <Alert
          className="border-status-busy bg-status-busy/5"
          data-testid="alert-expired"
        >
          <XCircle className="w-5 h-5 text-status-busy" />
          <AlertTitle className="text-status-busy font-semibold mb-3">
            Paketi Biten / Geciken Öğrenciler
          </AlertTitle>
          <AlertDescription>
            {alertsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : expiredAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Paketi sona eren öğrenci bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2">
                {expiredAlerts.slice(0, 5).map((alert) => (
                  <Link
                    key={alert.student.id}
                    href={`/students/${alert.student.id}`}
                  >
                    <div
                      className="flex items-center justify-between p-2 rounded-md hover-elevate cursor-pointer"
                      data-testid={`expired-student-${alert.student.id}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {alert.student.firstName} {alert.student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Koç: {alert.student.coach.firstName}{" "}
                          {alert.student.coach.lastName}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {Math.abs(alert.daysRemaining)} gün gecikti
                      </Badge>
                    </div>
                  </Link>
                ))}
                {expiredAlerts.length > 5 && (
                  <Link href="/students">
                    <p className="text-xs text-primary hover:underline cursor-pointer mt-2">
                      {expiredAlerts.length - 5} öğrenci daha...
                    </p>
                  </Link>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
