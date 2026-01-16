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
import { Plus, TrendingUp, DollarSign, Wallet, CreditCard, Activity, Calendar as CalendarIcon, Download, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type DateRangeOption = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_year" | "custom";

interface FinancialSummary {
    revenue: number;
    netRevenue: number;
    coachCost: number;
    expenses: number;
    netProfit: number;
    breakdown: {
        income: any[];
        expenses: any[];
    };
}

export default function Financials() {
    const [dateRange, setDateRange] = useState<DateRangeOption>("last_6_months");
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
    const { data: summary, isLoading: loadingSummary } = useQuery<FinancialSummary>({
        queryKey: ["/api/financials/summary", startDate, endDate],
        enabled: !!startDate && !!endDate,
    });

    // Fetch Expenses List
    const { data: expenses, isLoading: loadingExpenses } = useQuery<any[]>({
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gradient-neon mb-2">
                        Finansal Yönetim
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        Ciro, kar ve gider analizleri
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Rapor Yazdır
                    </Button>
                    <Button
                        onClick={() => setAddExpenseOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all duration-300 hover:scale-105"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Gider Ekle
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-6 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Filter className="w-24 h-24 text-primary" />
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-end relative z-10">
                    <div className="w-full md:w-[240px]">
                        <label className="text-sm font-medium mb-2 block text-muted-foreground">Zaman Aralığı</label>
                        <Select
                            value={dateRange}
                            onValueChange={(v) => setDateRange(v as DateRangeOption)}
                        >
                            <SelectTrigger className="h-11 bg-background/50 border-input/50 focus:ring-primary/50">
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
                        <label className="text-sm font-medium mb-2 block text-muted-foreground">Başlangıç</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="date"
                                className="pl-10 h-11 bg-background/50 border-input/50 focus:ring-primary/50"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDateRange("custom");
                                }}
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-[200px]">
                        <label className="text-sm font-medium mb-2 block text-muted-foreground">Bitiş</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="date"
                                className="pl-10 h-11 bg-background/50 border-input/50 focus:ring-primary/50"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDateRange("custom");
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card border-none bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-l-4 border-l-blue-500 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                        <DollarSign className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-400 uppercase tracking-wide">Toplam Ciro (Gross)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-32 bg-white/10" /> : (
                            <div className="text-3xl font-bold text-foreground">{formatCurrency(summary?.revenue || 0)}</div>
                        )}
                        <p className="text-xs text-blue-400/70 mt-1 font-medium">Öğrenci Ödemeleri</p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none bg-gradient-to-br from-sky-500/10 to-cyan-500/10 border-l-4 border-l-sky-500 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                        <Wallet className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-sky-400 uppercase tracking-wide">Net Ciro (%94)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-32 bg-white/10" /> : (
                            <div className="text-3xl font-bold text-foreground">{formatCurrency(summary?.netRevenue || 0)}</div>
                        )}
                        <p className="text-xs text-sky-400/70 mt-1 font-medium">%6 Komisyon düşüldü</p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-l-4 border-l-orange-500 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                        <CreditCard className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-400 uppercase tracking-wide">Toplam Giderler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-32 bg-white/10" /> : (
                            <div className="text-3xl font-bold text-foreground">{formatCurrency((summary?.coachCost || 0) + (summary?.expenses || 0))}</div>
                        )}
                        <div className="text-xs text-orange-400/70 mt-1 flex flex-col font-medium">
                            <span>Koç: {formatCurrency(summary?.coachCost || 0)}</span>
                            <span>Diğer: {formatCurrency(summary?.expenses || 0)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-l-4 border-l-emerald-500 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-3 opacity-10">
                        <TrendingUp className="w-16 h-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400 uppercase tracking-wide">Net Kar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingSummary ? <Skeleton className="h-8 w-32 bg-white/10" /> : (
                            <div className="text-3xl font-bold text-foreground">{formatCurrency(summary?.netProfit || 0)}</div>
                        )}
                        <p className="text-xs text-emerald-400/70 mt-1 font-medium">Net Ciro - Giderler</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="summary" className="space-y-4">
                <TabsList className="bg-white/5 p-1 border border-white/10 rounded-xl">
                    <TabsTrigger value="summary" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">Finansal Özet</TabsTrigger>
                    <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">Gider Listesi</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 focus-visible:outline-none">
                    <Card className="glass-card border-none">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Gelir Detayları
                            </CardTitle>
                            <CardDescription className="text-muted-foreground/80">
                                {format(new Date(startDate), "dd.MM.yyyy")} - {format(new Date(endDate), "dd.MM.yyyy")} arasındaki öğrenci ödemeleri
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-primary/5 hover:bg-primary/10 border-b border-primary/10">
                                        <TableHead className="font-semibold text-primary/80">Tarih</TableHead>
                                        <TableHead className="font-semibold text-primary/80">Öğrenci</TableHead>
                                        <TableHead className="font-semibold text-primary/80">Tutar</TableHead>
                                        <TableHead className="font-semibold text-primary/80">%6 Komisyon</TableHead>
                                        <TableHead className="text-right font-semibold text-primary/80">Net Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingSummary ? (
                                        <TableRow className="border-b border-white/5"><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell></TableRow>
                                    ) : summary?.breakdown?.income?.length === 0 ? (
                                        <TableRow className="border-b border-white/5">
                                            <TableCell colSpan={5} className="text-center py-12">
                                                <div className="flex flex-col items-center opacity-50">
                                                    <DollarSign className="w-12 h-12 mb-2" />
                                                    <p>Bu aralıkta gelir kaydı bulunamadı</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        summary?.breakdown?.income?.map((p: any, index: number) => (
                                            <TableRow
                                                key={p.id}
                                                className={`
                                                  border-b border-white/5 transition-colors hover:bg-white/5
                                                  ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                                                `}
                                            >
                                                <TableCell className="text-muted-foreground font-mono">{format(new Date(p.paymentDate), "dd.MM.yyyy")}</TableCell>
                                                <TableCell className="font-medium text-foreground">Öğrenci #{p.studentId}</TableCell>
                                                <TableCell className="font-bold text-foreground">{formatCurrency(parseFloat(p.amount))}</TableCell>
                                                <TableCell className="text-red-400 font-mono text-xs">{formatCurrency(parseFloat(p.amount) * 0.06)}</TableCell>
                                                <TableCell className="text-right font-bold text-green-400">{formatCurrency(parseFloat(p.amount) * 0.94)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4 focus-visible:outline-none">
                    <Card className="glass-card border-none">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Gider Detayları
                            </CardTitle>
                            <CardDescription className="text-muted-foreground/80">
                                {format(new Date(startDate), "dd.MM.yyyy")} - {format(new Date(endDate), "dd.MM.yyyy")} arasındaki tüm harcamalar
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-primary/5 hover:bg-primary/10 border-b border-primary/10">
                                        <TableHead className="font-semibold text-primary/80">Tarih</TableHead>
                                        <TableHead className="font-semibold text-primary/80">Açıklama</TableHead>
                                        <TableHead className="font-semibold text-primary/80">Kategori</TableHead>
                                        <TableHead className="font-semibold text-primary/80">Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingExpenses ? (
                                        <TableRow className="border-b border-white/5"><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Yükleniyor...</TableCell></TableRow>
                                    ) : expenses?.length === 0 ? (
                                        <TableRow className="border-b border-white/5">
                                            <TableCell colSpan={4} className="text-center py-12">
                                                <div className="flex flex-col items-center opacity-50">
                                                    <CreditCard className="w-12 h-12 mb-2" />
                                                    <p>Bu aralıkta gider kaydı bulunamadı</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        expenses?.map((e: any, index: number) => (
                                            <TableRow
                                                key={e.id}
                                                className={`
                                                  border-b border-white/5 transition-colors hover:bg-white/5
                                                  ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                                                `}
                                            >
                                                <TableCell className="text-muted-foreground font-mono">{format(new Date(e.date), "dd.MM.yyyy")}</TableCell>
                                                <TableCell className="font-medium text-foreground">{e.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize bg-white/5 border-white/10 text-muted-foreground">
                                                        {e.category === "transfer_fee" ? "Havale Ücreti" : e.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold text-red-400">{formatCurrency(parseFloat(e.amount))}</TableCell>
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
