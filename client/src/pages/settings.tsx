import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SystemSettings } from "@shared/schema";
import { Settings2, Save, Calendar, Wallet } from "lucide-react";

const settingsSchema = z.object({
  coachMonthlyFee: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Geçerli bir tutar giriniz",
  }),
  globalPaymentDay: z.number().min(1).max(31),
  baseDays: z.number().min(28).max(31),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      coachMonthlyFee: "1100.00",
      globalPaymentDay: 28,
      baseDays: 31,
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings && !form.formState.isDirty) {
      form.reset({
        coachMonthlyFee: settings.coachMonthlyFee,
        globalPaymentDay: settings.globalPaymentDay,
        baseDays: (settings as any).baseDays || 31,
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      return await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/enhanced-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/current-month"] });
      toast({
        title: "Başarılı",
        description: "Sistem ayarları güncellendi",
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

  const onSubmit = (data: SettingsForm) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-gradient-neon mb-2">Ayarlar</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          Sistem yapılandırması ve varsayılan değerleri yönetin
        </p>
      </div>

      <div className="glass-card border-none rounded-xl overflow-hidden shadow-xl">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Global Sistem Ayarları
          </h2>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Bu ayarlar tüm koç ödemelerini, hakediş hesaplamalarını ve sistem genelindeki varsayılanları etkiler.
          </p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-24 w-full bg-white/5" />
              <Skeleton className="h-24 w-full bg-white/5" />
              <Skeleton className="h-24 w-full bg-white/5" />
              <div className="flex justify-end pt-4">
                <Skeleton className="h-10 w-32 bg-white/5" />
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="coachMonthlyFee"
                  render={({ field }) => (
                    <FormItem className="glass-card p-4 rounded-lg border-white/5 bg-white/[0.02]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-primary/20 p-2 rounded-lg">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <FormLabel className="text-lg font-medium">Koç Aylık Sabit Hakediş Ücreti</FormLabel>
                      </div>

                      <div className="pl-12 space-y-2">
                        <FormDescription className="text-muted-foreground/80 mb-2">
                          Bir koçun her aktif öğrenci için hak ettiği aylık brüt ücret tutarıdır.
                        </FormDescription>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <div className="relative max-w-xs">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₺</span>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-8 h-12 text-lg font-bold bg-background/50 border-input/50 focus:ring-primary/50"
                                data-testid="input-coach-monthly-fee"
                              />
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="globalPaymentDay"
                    render={({ field }) => (
                      <FormItem className="glass-card p-4 rounded-lg border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-400" />
                          </div>
                          <FormLabel className="text-base font-medium">Ödeme Günü</FormLabel>
                        </div>

                        <div className="pl-12 space-y-2">
                          <FormDescription className="text-xs mb-2">
                            Her ayın kaçıncı günü ödeme yapılacak?
                          </FormDescription>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                max="31"
                                className="max-w-[100px] h-11 text-center font-bold bg-background/50 border-input/50 focus:ring-blue-500/50"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                                data-testid="input-payment-day"
                              />
                            </FormControl>
                            <span className="text-sm font-medium opacity-70">. Gün</span>
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="baseDays"
                    render={({ field }) => (
                      <FormItem className="glass-card p-4 rounded-lg border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Calendar className="w-5 h-5 text-purple-400" />
                          </div>
                          <FormLabel className="text-base font-medium">Ay Bazı Gün Sayısı</FormLabel>
                        </div>

                        <div className="pl-12 space-y-2">
                          <FormDescription className="text-xs mb-2">
                            Günlük ücret hesaplamasında kullanılan baz gün (örn: 30 veya 31).
                          </FormDescription>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="28"
                                max="31"
                                className="max-w-[100px] h-11 text-center font-bold bg-background/50 border-input/50 focus:ring-purple-500/50"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                                data-testid="input-base-days"
                              />
                            </FormControl>
                            <span className="text-sm font-medium opacity-70">Gün</span>
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => form.reset()}
                    disabled={!form.formState.isDirty || mutation.isPending}
                    data-testid="button-reset"
                    className="hover:bg-white/5 hover:text-foreground text-muted-foreground"
                  >
                    Değişiklikleri İptal Et
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!form.formState.isDirty || mutation.isPending}
                    data-testid="button-save-settings"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all duration-300 hover:scale-105 min-w-[150px]"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {mutation.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
