import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StudentWithCoach } from "@shared/schema";
import { format, parseISO, addMonths, differenceInDays, max } from "date-fns";
import { tr } from "date-fns/locale";
import { AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RenewPackageDialogProps {
  open: boolean;
  onClose: () => void;
  student?: StudentWithCoach;
}

export function RenewPackageDialog({
  open,
  onClose,
  student,
}: RenewPackageDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [additionalMonths, setAdditionalMonths] = useState("1");

  const currentEndDate = student ? parseISO(student.packageEndDate) : new Date();
  const today = new Date();
  const daysRemaining = student ? differenceInDays(currentEndDate, today) : 0;
  const hasGap = daysRemaining < 0;
  const gapDays = hasGap ? Math.abs(daysRemaining) : 0;

  const extensionBase = hasGap ? today : currentEndDate;
  const newEndDate = addMonths(extensionBase, parseInt(additionalMonths));

  const renewMutation = useMutation({
    mutationFn: async (data: { studentId: string; additionalMonths: number }) => {
      const res = await apiRequest(
        "POST",
        `/api/students/${data.studentId}/renew`,
        { additionalMonths: data.additionalMonths }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/enhanced-stats"] });
      toast({
        title: "Paket yenilendi",
        description: `Öğrenci paketi ${additionalMonths} ay uzatıldı.`,
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
    renewMutation.mutate({
      studentId: student.id,
      additionalMonths: parseInt(additionalMonths),
    });
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Paket Yenileme
          </DialogTitle>
          <DialogDescription>
            {student.firstName} {student.lastName} için paketi uzat
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
                  Yenileme bugünden itibaren başlayacak. {gapDays} günlük boşluk
                  hakediş hesaplamasına dahil edilmeyecek.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ek Süre</Label>
            <Select value={additionalMonths} onValueChange={setAdditionalMonths}>
              <SelectTrigger data-testid="select-additional-months">
                <SelectValue placeholder="Süre seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Ay</SelectItem>
                <SelectItem value="2">2 Ay</SelectItem>
                <SelectItem value="3">3 Ay</SelectItem>
                <SelectItem value="4">4 Ay</SelectItem>
                <SelectItem value="5">5 Ay</SelectItem>
                <SelectItem value="6">6 Ay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Yeni Bitiş Tarihi</p>
              <p className="font-medium text-primary">
                {format(newEndDate, "dd.MM.yyyy", { locale: tr })}
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
            disabled={renewMutation.isPending}
            data-testid="button-confirm-renew"
          >
            {renewMutation.isPending ? "Yenileniyor..." : "Paketi Yenile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
