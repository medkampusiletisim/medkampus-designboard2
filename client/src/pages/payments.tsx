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
  Download
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Hakediş Ödemeleri</h1>
        <p className="text-sm text-muted-foreground">
          Koç hakedişlerini görüntüle ve ödeme döngülerini takip et
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousPeriod}
            data-testid="button-prev-period"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-4 py-2 bg-muted rounded-md min-w-[180px] text-center">
            <span className="font-medium" data-testid="text-current-period">
              {getPeriodLabel(currentPeriod)}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPeriod}
            data-testid="button-next-period"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/export/payrolls/${currentPeriod}`, "_blank")}
            disabled={!payrolls || payrolls.length === 0}
            data-testid="button-export-payrolls"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel İndir
          </Button>
          <Button
            onClick={() => calculateMutation.mutate(currentPeriod)}
            disabled={calculateMutation.isPending}
            data-testid="button-calculate-payroll"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {calculateMutation.isPending ? "Hesaplanıyor..." : "Hakediş Hesapla"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-payment">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Toplam Ödeme
            </CardTitle>
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="text-3xl font-semibold text-foreground">
                {totalPayment.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₺
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-pending-count">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bekleyen
            </CardTitle>
            <Clock className="w-5 h-5 text-status-away" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <div className="text-3xl font-semibold text-status-away">
                {pendingCount}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-paid-count">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ödendi
            </CardTitle>
            <Check className="w-5 h-5 text-status-online" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <div className="text-3xl font-semibold text-status-online">
                {paidCount}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-payment-cycle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ödeme Döngüsü
            </CardTitle>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {format(cycleStart, "dd.MM.yyyy", { locale: tr })} - {format(cycleEnd, "dd.MM.yyyy", { locale: tr })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ödeme günü: {paymentDay}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Koç Hakedişleri</CardTitle>
          <p className="text-sm text-muted-foreground">
            {getPeriodLabel(currentPeriod)} dönemi için kıstelyevm hesaplaması
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !payrolls || payrolls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Bu dönem için hakediş hesaplanmamış</p>
              <p className="text-sm">
                Hakediş hesaplamak için yukarıdaki "Hakediş Hesapla" butonuna tıklayın
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Koç Adı</TableHead>
                  <TableHead className="text-center">Öğrenci Sayısı</TableHead>
                  <TableHead className="text-right">Toplam Hakediş (₺)</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
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
                    <TableRow
                      key={payroll.id}
                      className="group"
                      data-testid={`row-payroll-${payroll.id}`}
                    >
                      <TableCell colSpan={6} className="p-0">
                        <div>
                          <div
                            className="flex items-center px-4 py-3 hover-elevate cursor-pointer"
                            onClick={() => toggleCoach(payroll.id)}
                          >
                            <div className="w-8">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 font-medium">{payroll.coachName}</div>
                            <div className="w-32 text-center">{payroll.studentCount}</div>
                            <div className="w-40 text-right font-semibold">
                              {parseFloat(payroll.totalAmount).toLocaleString("tr-TR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              ₺
                            </div>
                            <div className="w-32 text-center">
                              {payroll.status === "paid" ? (
                                <Badge className="gap-1 bg-status-online/10 text-status-online border-status-online/20">
                                  <Check className="w-3 h-3" />
                                  Ödendi
                                </Badge>
                              ) : (
                                <Badge className="gap-1 bg-status-away/10 text-status-away border-status-away/20">
                                  <Clock className="w-3 h-3" />
                                  Beklemede
                                </Badge>
                              )}
                            </div>
                            <div className="w-32 text-right">
                              {payroll.status === "pending" && (
                                <Button
                                  size="sm"
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
                            <div className="bg-muted/30 px-8 py-4 border-t">
                              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                                Öğrenci Bazında Döküm
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Öğrenci Adı</TableHead>
                                    <TableHead className="text-center">Çalışılan Gün</TableHead>
                                    <TableHead className="text-right">Tutar (₺)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {breakdown.map((item, idx) => (
                                    <TableRow key={`${item.studentId}-${idx}`}>
                                      <TableCell>{item.studentName}</TableCell>
                                      <TableCell className="text-center">{item.daysWorked}</TableCell>
                                      <TableCell className="text-right">
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

                              {payroll.paidAt && (
                                <div className="mt-4 text-xs text-muted-foreground flex items-center gap-4">
                                  <span>
                                    <span className="font-medium">Ödeme Tarihi:</span>{" "}
                                    {format(parseISO(payroll.paidAt), "dd.MM.yyyy HH:mm", { locale: tr })}
                                  </span>
                                  {payroll.paidBy && (
                                    <span>
                                      <span className="font-medium">Ödeyen:</span> {payroll.paidBy}
                                    </span>
                                  )}
                                </div>
                              )}
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
        </CardContent>
      </Card>

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
