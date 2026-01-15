import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudentWithCoach } from "@shared/schema";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const archiveFormSchema = z.object({
    leaveDate: z.string().min(1, "Ayrılma tarihi gereklidir"),
});

type ArchiveFormValues = z.infer<typeof archiveFormSchema>;

interface ArchiveStudentDialogProps {
    open: boolean;
    onClose: () => void;
    student?: StudentWithCoach;
}

export function ArchiveStudentDialog({ open, onClose, student }: ArchiveStudentDialogProps) {
    const { toast } = useToast();

    const form = useForm<ArchiveFormValues>({
        resolver: zodResolver(archiveFormSchema),
        defaultValues: {
            leaveDate: format(new Date(), "yyyy-MM-dd"),
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                leaveDate: format(new Date(), "yyyy-MM-dd"),
            });
        }
    }, [open, form]);

    const mutation = useMutation({
        mutationFn: async (data: ArchiveFormValues) => {
            if (!student) return;
            return await apiRequest("PUT", `/api/students/${student.id}/archive`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({
                title: "Başarılı",
                description: "Öğrenci başarıyla arşivlendi.",
            });
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

    const onSubmit = (data: ArchiveFormValues) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Öğrenciyi Arşivle
                    </DialogTitle>
                    <DialogDescription>
                        {student?.firstName} {student?.lastName} isimli öğrenciyi arşivlemek üzeresiniz.
                        Bu işlem geri alınamaz ancak öğrenci kaydı silinmez.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="leaveDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Ayrılma Tarihi</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(new Date(field.value), "dd MMMM yyyy", { locale: tr })
                                                    ) : (
                                                        <span>Tarih seçin</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) =>
                                                    field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                                }
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                                locale={tr}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Bu tarihten sonra koç hakedişi hesaplanmayacaktır.
                                    </p>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                disabled={mutation.isPending}
                            >
                                İptal
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? "Arşivleniyor..." : "Arşivle"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
