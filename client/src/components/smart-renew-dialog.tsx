import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StudentWithCoach, StudentPayment, SmartRenewalMode } from "@shared/schema";
import { format, parseISO, addMonths, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { AlertCircle, Calendar, RefreshCw, Zap, TrendingUp, ArrowRightLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SmartRenewDialogProps {
  open: boolean;
  onClose: () => void;
  student?: StudentWithCoach;
}

export function SmartRenewDialog({
  open,
  onClose,
  student,
}: SmartRenewDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [renewalMode, setRenewalMode] = useState<SmartRenewalMode>("quick");
  const [amount, setAmount] = useState("");
  const [packageMonths, setPackageMonths] = useState("1");

  const { data: lastPayment, isLoading: isLoadingLastPayment } = useQuery<StudentPayment | null>({
    queryKey: ["/api/students", student?.id, "last-payment"],
    enabled: !!student?.id && open,
  });

  useEffect(() => {
    if (open) {
      setRenewalMode("quick");
      setAmount("");
      setPackageMonths(String(student?.packageMonths || 1));
    }
  }, [open, student]);

  useEffect(() => {
    if (lastPayment && renewalMode === "price_update") {
      setPackageMonths(String(lastPayment.packageDurationMonths));
    }
  }, [lastPayment, renewalMode]);

  const currentEndDate = student ? parseISO(student.packageEndDate) : new Date();
  const today = new Date();
  const daysRemaining = student ? differenceInDays(currentEndDate, today) : 0;
  const hasGap = daysRemaining < 0;
  const gapDays = hasGap ? Math.abs(daysRemaining) : 0;

  const extensionBase = hasGap ? today : currentEndDate;
  const months = renewalMode === "package_switch" 
    ? parseInt(packageMonths) 
    : (lastPayment?.packageDurationMonths || student?.packageMonths || 1);
  const newEndDate = addMonths(extensionBase, months);

  const displayAmount = renewalMode === "quick" 
    ? (lastPayment?.amount || "—")
    : amount;
  
  const displayMonths = renewalMode === "quick" || renewalMode === "price_update"
    ? (lastPayment?.packageDurationMonths || student?.packageMonths || 1)
    : parseInt(packageMonths);

  const smartRenewMutation = useMutation({
    mutationFn: async (data: { 
      studentId: string; 
      mode: SmartRenewalMode;
      amount?: string;
      packageMonths?: number;
    }) => {
      let body: any = { mode: data.mode };
      
      if (data.mode === "price_update") {
        body.amount = data.amount;
      } else if (data.mode === "package_switch") {
        body.amount = data.amount;
        body.packageMonths = data.packageMonths;
      }
      
      const res = await apiRequest(
        "POST",
        `/api/students/${data.studentId}/smart-renew`,
        body
      );
      return res.json();
    },
    onSuccess: (data: { mode: SmartRenewalMode }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/enhanced-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", student?.id, "last-payment"] });
      
      const modeLabels: Record<SmartRenewalMode, string> = {
        quick: "Hızlı Yenileme",
        price_update: "Fiyat Güncelleme",
        package_switch: "Paket Değişikliği",
      };
      
      toast({
        title: "Paket yenilendi",
        description: `${modeLabels[data.mode]} ile paket ${displayMonths} ay uzatıldı.`,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Paket yenileme başarısız oldu.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!student) return;

    if (renewalMode === "quick" && !lastPayment) {
      toast({
        title: "Hata",
        description: "Son ödeme kaydı bulunamadı. Lütfen 'Fiyat Güncelleme' veya 'Paket Değişikliği' seçeneğini kullanın.",
        variant: "destructive",
      });
      return;
    }

    if ((renewalMode === "price_update" || renewalMode === "package_switch") && !amount) {
      toast({
        title: "Hata",
        description: "Tutar gerekli.",
        variant: "destructive",
      });
      return;
    }

    smartRenewMutation.mutate({
      studentId: student.id,
      mode: renewalMode,
      amount: renewalMode !== "quick" ? amount : undefined,
      packageMonths: renewalMode === "package_switch" ? parseInt(packageMonths) : undefined,
    });
  };

  if (!student) return null;

  const canQuickRenew = !!lastPayment;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Akıllı Paket Yenileme
          </DialogTitle>
          <DialogDescription>
            {student.firstName} {student.lastName} için paketi yenile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Mevcut Bitiş</p>
              <p className="font-medium">
                {format(currentEndDate, "dd.MM.yyyy", { locale: tr })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durum</p>
              {hasGap ? (
                <Badge className="bg-status-busy/10 text-status-busy border-status-busy/20">
                  {gapDays} gün gecikmiş
                </Badge>
              ) : daysRemaining <= 7 ? (
                <Badge className="bg-status-away/10 text-status-away border-status-away/20">
                  {daysRemaining} gün kaldı
                </Badge>
              ) : (
                <Badge className="bg-status-online/10 text-status-online border-status-online/20">
                  {daysRemaining} gün kaldı
                </Badge>
              )}
            </div>
          </div>

          {hasGap && (
            <div className="flex items-start gap-2 p-3 bg-status-busy/10 text-status-busy border border-status-busy/20 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Paket süresi dolmuş</p>
                <p className="text-muted-foreground mt-1">
                  Yenileme bugünden itibaren başlayacak.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-base font-medium">Yenileme Modu</Label>
            
            <RadioGroup
              value={renewalMode}
              onValueChange={(v) => setRenewalMode(v as SmartRenewalMode)}
              className="grid gap-3"
            >
              <Card 
                className={`cursor-pointer transition-all ${renewalMode === "quick" ? "border-primary ring-1 ring-primary" : ""} ${!canQuickRenew ? "opacity-50" : ""}`}
                onClick={() => canQuickRenew && setRenewalMode("quick")}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <RadioGroupItem value="quick" id="quick" disabled={!canQuickRenew} className="mt-1" data-testid="radio-mode-quick" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <Label htmlFor="quick" className="font-medium cursor-pointer">
                        Hızlı Yenileme
                      </Label>
                      <Badge variant="secondary" className="text-xs">Aynı Paket & Ücret</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Öğrenci mevcut tarifesinden devam ediyor. Tek tıkla işlem biter.
                    </p>
                    {isLoadingLastPayment ? (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-muted-foreground">Yükleniyor...</span>
                      </div>
                    ) : lastPayment ? (
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Son: <span className="font-medium text-foreground">{Number(lastPayment.amount).toLocaleString("tr-TR")} ₺</span>
                        </span>
                        <span className="text-muted-foreground">
                          Süre: <span className="font-medium text-foreground">{lastPayment.packageDurationMonths} Ay</span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-status-busy mt-2">Son ödeme kaydı yok</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${renewalMode === "price_update" ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setRenewalMode("price_update")}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <RadioGroupItem value="price_update" id="price_update" className="mt-1" data-testid="radio-mode-price-update" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <Label htmlFor="price_update" className="font-medium cursor-pointer">
                        Fiyat Güncelleme
                      </Label>
                      <Badge variant="secondary" className="text-xs">Aynı Paket & Yeni Ücret</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paket süresi aynı kalır, sadece fiyata zam yapılır.
                    </p>
                    
                    {renewalMode === "price_update" && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[60px]">Süre:</span>
                          <Badge>{lastPayment?.packageDurationMonths || student.packageMonths} Ay</Badge>
                          <span className="text-xs text-muted-foreground">(değiştirilemez)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="amount-update" className="text-sm min-w-[60px]">Tutar:</Label>
                          <Input
                            id="amount-update"
                            type="number"
                            placeholder="Yeni tutar"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-32"
                            data-testid="input-amount-price-update"
                          />
                          <span className="text-sm text-muted-foreground">₺</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${renewalMode === "package_switch" ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setRenewalMode("package_switch")}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <RadioGroupItem value="package_switch" id="package_switch" className="mt-1" data-testid="radio-mode-package-switch" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                      <Label htmlFor="package_switch" className="font-medium cursor-pointer">
                        Paket Değişikliği
                      </Label>
                      <Badge variant="secondary" className="text-xs">Farklı Paket & Yeni Ücret</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Öğrenci farklı süredeki bir pakete geçiyor.
                    </p>
                    
                    {renewalMode === "package_switch" && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="package-months" className="text-sm min-w-[60px]">Süre:</Label>
                          <Select value={packageMonths} onValueChange={setPackageMonths}>
                            <SelectTrigger className="w-32" data-testid="select-package-months">
                              <SelectValue placeholder="Süre seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                  {m} Ay
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="amount-switch" className="text-sm min-w-[60px]">Tutar:</Label>
                          <Input
                            id="amount-switch"
                            type="number"
                            placeholder="Yeni tutar"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-32"
                            data-testid="input-amount-package-switch"
                          />
                          <span className="text-sm text-muted-foreground">₺</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Yeni Bitiş Tarihi</p>
              <p className="font-medium text-primary">
                {format(newEndDate, "dd.MM.yyyy", { locale: tr })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tutar</p>
              <p className="font-medium">
                {renewalMode === "quick" 
                  ? (lastPayment ? `${Number(lastPayment.amount).toLocaleString("tr-TR")} ₺` : "—")
                  : (amount ? `${Number(amount).toLocaleString("tr-TR")} ₺` : "—")
                }
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={smartRenewMutation.isPending || (renewalMode === "quick" && !canQuickRenew)}
            data-testid="button-confirm-smart-renew"
          >
            {smartRenewMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Yenileniyor...
              </>
            ) : (
              "Paketi Yenile"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
