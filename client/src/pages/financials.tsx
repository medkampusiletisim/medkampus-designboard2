import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { Plus, TrendingUp, DollarSign, Wallet, CreditCard, Activity, Calendar as CalendarIcon, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type DateRangeOption = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_year" | "custom";

export default function Financials() {
    const [dateRange, setDateRange] = useState<DateRangeOption>("this_month");
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    const [addExpenseOpen, setAddExpenseOpen] = useState(false);

    // Handle preset changes
    useEffect(() => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (dateRange) {
            case "this_month":
                start = startOfMonth(today);
                end = endOfMonth(today);
                break;
            case "last_month":
                start = startOfMonth(subMonths(today, 1));
                end = endOfMonth(subMonths(today, 1));
                break;
            case "last_3_months":
                start = subMonths(today, 3);
                end = today;
                break;
            case "last_6_months":
                start = subMonths(today, 6);
                end = today;
                break;
            case "this_year":
                start = startOfYear(today);
                end = endOfYear(today);
                break;
            case "custom":
                return; // Don't change dates on custom selection switch, let user edit
        }

        setStartDate(format(start, "yyyy-MM-dd"));
        setEndDate(format(end, "yyyy-MM-dd"));
    }, [dateRange]);

    // Fetch Financial Summary
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ["/api/financials/summary", startDate, endDate],
        enabled: !!startDate && !!endDate,
    });

    // Fetch Expenses List
    const { data: expenses, isLoading: loadingExpenses } = useQuery({
        queryKey: ["/api/expenses", startDate, endDate],
        enabled: !!startDate && !!endDate,
    });

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }) + " ₺";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">
                        Ciro / Kar Takibi
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Finansal durum ve karlılık analizi
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Download className="mr-2 h-4 w-4" />
                        Rapor Yazdır
                    </Button>
                    <Button onClick={() => setAddExpenseOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Gider Ekle
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-[200px]">
                            <label className="text-sm font-medium mb-1 block">Zaman Aralığı</label>
                            <Select
                                value={dateRange}
                                onValueChange={(v) => setDateRange(v as DateRangeOption)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="this_month">Bu Ay</SelectItem>
                                    <SelectItem value="last_month">Geçen Ay</SelectItem>
                                    <SelectItem value="last_3_months">Son 3 Ay</SelectItem>
                                    <SelectItem value="last_6_months">Son 6 Ay</SelectItem>
                                    <SelectItem value="this_year">Bu Yıl</SelectItem>
                                    <SelectItem value="custom">Özel Tarih</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full md:w-[200px]">
                            <label className="text-sm font-medium mb-1 block">Başlangıç</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDateRange("custom");
                                }}
                            />
                        </div>

                        <div className="w-full md:w-[200px]">
                            <label className="text-sm font-medium mb-1 block">Bitiş</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDateRange("custom");
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Toplam Ciro (Gross)</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-24" /> : (
                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(summary?.revenue || 0)}</div>
                        )}
                        <p className="text-xs text-blue-600/80 mt-1">Öğrenci Ödemeleri</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-sky-900">Net Ciro (%94)</CardTitle>
                        <Wallet className="h-4 w-4 text-sky-600" />
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-24" /> : (
                            <div className="text-2xl font-bold text-sky-700">{formatCurrency(summary?.netRevenue || 0)}</div>
                        )}
                        <p className="text-xs text-sky-600/80 mt-1">%6 Komisyon düşüldü</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-900">Toplam Giderler</CardTitle>
                        <CreditCard className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-24" /> : (
                            <div className="text-2xl font-bold text-orange-700">{formatCurrency((summary?.coachCost || 0) + (summary?.expenses || 0))}</div>
                        )}
                        <div className="text-xs text-orange-600/80 mt-1 flex flex-col">
                            <span>Koç: {formatCurrency(summary?.coachCost || 0)}</span>
                            <span>Diğer: {formatCurrency(summary?.expenses || 0)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Net Kar</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-24" /> : (
                            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(summary?.netProfit || 0)}</div>
                        )}
                        <p className="text-xs text-emerald-600/80 mt-1">Net Ciro - Giderler</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="summary">
                <TabsList>
                    <TabsTrigger value="summary">Finansal Özet</TabsTrigger>
                    <TabsTrigger value="expenses">Gider Listesi</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gelir Detayları</CardTitle>
                            <CardDescription>
                                {startDate} - {endDate} arasındaki öğrenci ödemeleri
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Öğrenci</TableHead>
                                        <TableHead>Tutar</TableHead>
                                        <TableHead>%6 Komisyon</TableHead>
                                        <TableHead className="text-right">Net Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingSummary ? (
                                        <TableRow><TableCell colSpan={5} className="text-center">Yükleniyor...</TableCell></TableRow>
                                    ) : summary?.breakdown?.income?.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center">Kayıt yok</TableCell></TableRow>
                                    ) : (
                                        summary?.breakdown?.income?.map((p: any) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{format(new Date(p.paymentDate), "dd.MM.yyyy")}</TableCell>
                                                <TableCell>Öğrenci #{p.studentId}</TableCell>
                                                <TableCell>{formatCurrency(parseFloat(p.amount))}</TableCell>
                                                <TableCell className="text-muted-foreground">{formatCurrency(parseFloat(p.amount) * 0.06)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(parseFloat(p.amount) * 0.94)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gider Detayları</CardTitle>
                            <CardDescription>
                                {startDate} - {endDate} arasındaki tüm harcamalar
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead>Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingExpenses ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">Yükleniyor...</TableCell></TableRow>
                                    ) : expenses?.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">Kayıt yok</TableCell></TableRow>
                                    ) : (
                                        expenses?.map((e: any) => (
                                            <TableRow key={e.id}>
                                                <TableCell>{format(new Date(e.date), "dd.MM.yyyy")}</TableCell>
                                                <TableCell>{e.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {e.category === "transfer_fee" ? "Havale Ücreti" : e.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold">{formatCurrency(parseFloat(e.amount))}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AddExpenseDialog open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} />
        </div>
    );
}
