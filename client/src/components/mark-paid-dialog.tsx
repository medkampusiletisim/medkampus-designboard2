import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const markPaidSchema = z.object({
    transferFee: z.coerce.number().min(0, "Negatif olamaz").default(0),
    notes: z.string().optional(),
});

type MarkPaidValues = z.infer<typeof markPaidSchema>;

interface MarkPaidDialogProps {
    open: boolean;
    onClose: () => void;
    payrollId?: string;
}

export function MarkPaidDialog({ open, onClose, payrollId }: MarkPaidDialogProps) {
    const { toast } = useToast();

    const form = useForm<MarkPaidValues>({
        resolver: zodResolver(markPaidSchema),
        defaultValues: {
            transferFee: 0,
            notes: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: MarkPaidValues) => {
            if (!payrollId) return;
            return await apiRequest("PUT", `/api/coach-payrolls/${payrollId}/mark-paid`, {
                paidBy: "Admin", // Should be actual user ideally
                notes: data.notes,
                transferFee: data.transferFee,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/coach-payrolls/period"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/enhanced-stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] }); // Just in case
            toast({
                title: "Başarılı",
                description: "Ödeme tamamlandı olarak işaretlendi",
            });
            form.reset();
            onClose();
        },
        onError: (error: Error) => {
            toast({
                title: "Hata",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ödemeyi İşaretle</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="transferFee"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Havale/EFT Ücreti (TL)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Bu tutar gider olarak kaydedilecektir.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notlar</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ödeme detayları..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>
                                İptal
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
