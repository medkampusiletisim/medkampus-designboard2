import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Calendar,
  Check,
  Clock,
  Calculator,
  ChevronLeft,
  Download,
  CreditCard,
  Wallet,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkPaidDialog } from "@/components/mark-paid-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SystemSettings, CoachPayroll } from "@shared/schema";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface EnrichedCoachPayroll extends CoachPayroll {
  coachName: string;
  paidAt: string | null;
}

function getPeriodFromDate(date: Date): string {
  return format(date, "yyyy-MM");
}

function getPeriodLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, "MMMM yyyy", { locale: tr });
}

export default function Payments() {
  const [expandedCoaches, setExpandedCoaches] = useState<Set<string>>(new Set());
  const [currentPeriod, setCurrentPeriod] = useState(getPeriodFromDate(new Date()));
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | undefined>();
  const { toast } = useToast();

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: payrolls, isLoading } = useQuery<EnrichedCoachPayroll[]>({
    queryKey: ["/api/coach-payrolls/period", currentPeriod],
  });

  const calculateMutation = useMutation({
    mutationFn: async (periodMonth: string) => {
      const res = await apiRequest("POST", "/api/coach-payrolls/calculate", {
        periodMonth,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-payrolls/period", currentPeriod] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/enhanced-stats"] });
      toast({
        title: "Başarılı",
        description: `${getPeriodLabel(currentPeriod)} dönemi için hakediş hesaplandı`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("PUT", `/api/coach-payrolls/${id}/mark-paid`, {
        paidBy: "Admin",
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-payrolls/period", currentPeriod] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/enhanced-stats"] });
      toast({
        title: "Başarılı",
        description: "Ödeme tamamlandı olarak işaretlendi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleCoach = (coachId: string) => {
    const newExpanded = new Set(expandedCoaches);
    if (newExpanded.has(coachId)) {
      newExpanded.delete(coachId);
    } else {
      newExpanded.add(coachId);
    }
    setExpandedCoaches(newExpanded);
  };

  const goToPreviousPeriod = () => {
    const [year, month] = currentPeriod.split("-").map(Number);
    const prevDate = subMonths(new Date(year, month - 1), 1);
    setCurrentPeriod(getPeriodFromDate(prevDate));
    setExpandedCoaches(new Set());
  };

  const goToNextPeriod = () => {
    const [year, month] = currentPeriod.split("-").map(Number);
    const nextDate = addMonths(new Date(year, month - 1), 1);
    setCurrentPeriod(getPeriodFromDate(nextDate));
    setExpandedCoaches(new Set());
  };

  const totalPayment = payrolls?.reduce(
    (sum: number, payroll: EnrichedCoachPayroll) => sum + parseFloat(payroll.totalAmount),
    0
  ) || 0;

  const pendingCount = payrolls?.filter(p => p.status === "pending").length || 0;
  const paidCount = payrolls?.filter(p => p.status === "paid").length || 0;

  const paymentDay = settings?.globalPaymentDay || 28;

  const [periodYear, periodMonth] = currentPeriod.split("-").map(Number);
  const paymentDate = new Date(periodYear, periodMonth - 1, paymentDay);
  const cycleStart = new Date(periodYear, periodMonth - 2, paymentDay + 1);
  const cycleEnd = paymentDate;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient-neon mb-2">Hakediş Ödemeleri</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Koç hakedişlerini görüntüle ve ödeme döngülerini takip et
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-white/5 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousPeriod}
              data-testid="button-prev-period"
              className="hover:text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-2 min-w-[140px] text-center">
              <span className="font-semibold text-foreground tracking-wide" data-testid="text-current-period">
                {getPeriodLabel(currentPeriod)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPeriod}
              data-testid="button-next-period"
              className="hover:text-primary hover:bg-primary/10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/export/payrolls/${currentPeriod}`, "_blank")}
              disabled={!payrolls || payrolls.length === 0}
              data-testid="button-export-payrolls"
              className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/10 hover:text-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={() => calculateMutation.mutate(currentPeriod)}
              disabled={calculateMutation.isPending}
              data-testid="button-calculate-payroll"
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {calculateMutation.isPending ? "Hesaplanıyor..." : "Hakediş Hesapla"}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-payment" className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Toplam Ödeme
            </CardTitle>
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32 bg-white/10" />
            ) : (
              <div className="text-3xl font-bold text-foreground slashed-zero">
                {totalPayment.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-lg text-muted-foreground font-normal">₺</span>
              </div>
            )}
            <div className="mt-2 text-xs text-indigo-300/70">Bu dönem için toplam tutar</div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-count" className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Bekleyen
            </CardTitle>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16 bg-white/10" />
            ) : (
              <div className="text-3xl font-bold text-status-away">
                {pendingCount}
              </div>
            )}
            <div className="mt-2 text-xs text-amber-300/70">Ödeme bekleyen koç sayısı</div>
          </CardContent>
        </Card>

        <Card data-testid="card-paid-count" className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Check className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ödendi
            </CardTitle>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16 bg-white/10" />
            ) : (
              <div className="text-3xl font-bold text-status-online">
                {paidCount}
              </div>
            )}
            <div className="mt-2 text-xs text-emerald-300/70">Ödemesi yapılan koç sayısı</div>
          </CardContent>
        </Card>

        <Card data-testid="card-payment-cycle" className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Calendar className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ödeme Döngüsü
            </CardTitle>
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-foreground">
              {format(cycleStart, "dd.MM.yyyy", { locale: tr })} - {format(cycleEnd, "dd.MM.yyyy", { locale: tr })}
            </div>
            <div className="mt-2 text-xs text-cyan-300/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Ödeme Günü: <span className="text-white font-mono font-bold">{paymentDay}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="glass-card rounded-xl overflow-hidden shadow-2xl border-none">
        <div className="p-6 border-b border-white/5 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Koç Hakedişleri
          </h2>
          <p className="text-sm text-muted-foreground">
            {getPeriodLabel(currentPeriod)} dönemi için kıstelyevm ve öğrenci bazlı hesaplama detayları
          </p>
        </div>

        <div className="p-6 pt-0">
          {isLoading ? (
            <div className="space-y-3 mt-6">
              <Skeleton className="h-16 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
            </div>
          ) : !payrolls || payrolls.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Calculator className="w-8 h-8 opacity-40" />
              </div>
              <p className="mb-2 text-lg font-medium">Bu dönem için hakediş hesaplanmamış</p>
              <p className="text-sm opacity-60 max-w-md mx-auto">
                Hakediş hesaplamak veya verileri güncellemek için yukarıdaki "Hakediş Hesapla" butonunu kullanabilirsiniz.
              </p>
            </div>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow className="bg-white/5 border-none hover:bg-white/5 rounded-lg">
                  <TableHead className="w-12 rounded-l-lg"></TableHead>
                  <TableHead className="font-semibold text-primary/80">Koç Adı</TableHead>
                  <TableHead className="text-center font-semibold text-primary/80">Öğrenci Sayısı</TableHead>
                  <TableHead className="text-right font-semibold text-primary/80">Toplam Hakediş (₺)</TableHead>
                  <TableHead className="text-center font-semibold text-primary/80">Durum</TableHead>
                  <TableHead className="text-right rounded-r-lg font-semibold text-primary/80">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => {
                  const breakdown = payroll.breakdown as Array<{
                    studentId: string;
                    studentName: string;
                    daysWorked: number;
                    amount: string;
                  }>;
                  const isExpanded = expandedCoaches.has(payroll.id);

                  return (
                    // Use fragment or proper structure
                    <TableRow
                      key={payroll.id}
                      className="group border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                      data-testid={`row-payroll-${payroll.id}`}
                    >
                      <TableCell colSpan={6} className="p-0">
                        <div className="flex flex-col">
                          <div
                            className="flex items-center px-4 py-4 cursor-pointer transition-colors hover:bg-white/5"
                            onClick={() => toggleCoach(payroll.id)}
                          >
                            <div className="w-8 flex justify-center">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-primary" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <div className="flex-1 font-medium text-foreground">{payroll.coachName}</div>
                            <div className="w-32 text-center text-muted-foreground">{payroll.studentCount}</div>
                            <div className="w-40 text-right font-bold text-foreground">
                              {parseFloat(payroll.totalAmount).toLocaleString("tr-TR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              ₺
                            </div>
                            <div className="w-32 flex justify-center">
                              {payroll.status === "paid" ? (
                                <Badge variant="outline" className="gap-1 bg-status-online/10 text-status-online border-status-online/20 text-xs py-1">
                                  <Check className="w-3 h-3" />
                                  Ödendi
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 bg-status-away/10 text-status-away border-status-away/20 text-xs py-1">
                                  <Clock className="w-3 h-3" />
                                  Beklemede
                                </Badge>
                              )}
                            </div>
                            <div className="w-32 text-right pr-4">
                              {payroll.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPayrollId(payroll.id);
                                    setMarkPaidDialogOpen(true);
                                  }}
                                  data-testid={`button-mark-paid-${payroll.id}`}
                                >
                                  Ödendi İşaretle
                                </Button>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-black/20 animate-in slide-in-from-top-2 duration-200">
                              <div className="px-12 py-6 border-t border-white/5 border-b shadow-inner">
                                <h4 className="font-semibold text-sm text-primary mb-4 flex items-center gap-2">
                                  <Users size={14} />
                                  Öğrenci Bazında Hakediş Detayı
                                </h4>
                                <div className="rounded-lg border border-white/10 overflow-hidden bg-background/50">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-white/5 border-b border-white/10">
                                        <TableHead className="text-xs font-semibold h-9">Öğrenci Adı</TableHead>
                                        <TableHead className="text-center text-xs font-semibold h-9">Çalışılan Gün</TableHead>
                                        <TableHead className="text-right text-xs font-semibold h-9">Tutar (₺)</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {breakdown.map((item, idx) => (
                                        <TableRow key={`${item.studentId}-${idx}`} className="border-b border-white/5 hover:bg-white/5">
                                          <TableCell className="text-sm py-2">{item.studentName}</TableCell>
                                          <TableCell className="text-center text-sm py-2 font-mono text-muted-foreground">{item.daysWorked}</TableCell>
                                          <TableCell className="text-right text-sm py-2 font-medium">
                                            {parseFloat(item.amount).toLocaleString("tr-TR", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}{" "}
                                            ₺
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                {payroll.paidAt && (
                                  <div className="mt-4 text-xs text-muted-foreground flex items-center gap-4 bg-status-online/5 p-3 rounded border border-status-online/10">
                                    <span className="flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5 text-status-online" />
                                      <span className="font-semibold text-status-online">Ödeme Bilgisi:</span>
                                      {format(parseISO(payroll.paidAt), "dd.MM.yyyy HH:mm", { locale: tr })}
                                    </span>
                                    {payroll.paidBy && (
                                      <span className="opacity-70">
                                        <span className="font-medium">Ödeyen:</span> {payroll.paidBy}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <MarkPaidDialog
        open={markPaidDialogOpen}
        onClose={() => {
          setMarkPaidDialogOpen(false);
          setSelectedPayrollId(undefined);
        }}
        payrollId={selectedPayrollId}
      />
    </div>
  );
}
