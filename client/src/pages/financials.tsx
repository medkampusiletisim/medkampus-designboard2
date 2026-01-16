import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { Plus, TrendingUp, DollarSign, Wallet, CreditCard, Activity, Calendar as CalendarIcon, Download, Filter, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 p-2 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight font-[Space_Grotesk] text-neon-glow">
                        Finansal Yönetim
                    </h1>
                    <p className="text-gray-400 mt-2 font-light">Ciro, gider ve kârlılık analizleri</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                        <Download className="mr-2 h-4 w-4" />
                        Rapor İndir
                    </Button>
                    <Button
                        onClick={() => setAddExpenseOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Gider Ekle
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-emerald-400 min-w-fit">
                    <Filter className="w-5 h-5" />
                    <span className="font-medium">Filtrele</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
                        <SelectTrigger className="input-glass border-white/10 w-full">
                            <SelectValue placeholder="Dönem Seçin" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#050b0a] border-white/10 text-white">
                            <SelectItem value="this_month">Bu Ay</SelectItem>
                            <SelectItem value="last_month">Geçen Ay</SelectItem>
                            <SelectItem value="last_3_months">Son 3 Ay</SelectItem>
                            <SelectItem value="last_6_months">Son 6 Ay</SelectItem>
                            <SelectItem value="this_year">Bu Yıl</SelectItem>
                            <SelectItem value="custom">Özel Tarih</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setDateRange("custom"); setStartDate(e.target.value); }}
                            className="pl-10 input-glass"
                        />
                    </div>

                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setDateRange("custom"); setEndDate(e.target.value); }}
                            className="pl-10 input-glass"
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-32 h-32 text-emerald-400 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-emerald-400 uppercase tracking-widest mb-1">Toplam Ciro</p>
                        <h2 className="text-4xl font-bold text-white font-[Space_Grotesk] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            {loadingSummary ? <Skeleton className="h-10 w-32 bg-white/10" /> : formatCurrency(summary?.revenue || 0)}
                        </h2>
                        <div className="mt-4 flex items-center text-xs text-gray-400">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mr-2">Brüt</Badge>
                            Öğrenci ödemeleri
                        </div>
                    </div>
                </div>

                {/* Net Revenue */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="w-32 h-32 text-blue-400 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-blue-400 uppercase tracking-widest mb-1">Net Ciro (%94)</p>
                        <h2 className="text-4xl font-bold text-white font-[Space_Grotesk]">
                            {loadingSummary ? <Skeleton className="h-10 w-32 bg-white/10" /> : formatCurrency(summary?.netRevenue || 0)}
                        </h2>
                        <div className="mt-4 flex items-center text-xs text-gray-400">
                            <span className="text-blue-400 mr-1">%6</span> komisyon düşüldü
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard className="w-32 h-32 text-purple-400 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-purple-400 uppercase tracking-widest mb-1">Giderler</p>
                        <h2 className="text-4xl font-bold text-white font-[Space_Grotesk]">
                            {loadingSummary ? <Skeleton className="h-10 w-32 bg-white/10" /> : formatCurrency((summary?.expenses || 0) + (summary?.coachCost || 0))}
                        </h2>
                        <div className="mt-4 flex flex-col gap-1 text-xs text-gray-400">
                            <div className="flex justify-between w-40">
                                <span>Koç Hakediş:</span>
                                <span className="text-white">{formatCurrency(summary?.coachCost || 0)}</span>
                            </div>
                            <div className="flex justify-between w-40">
                                <span>Diğer:</span>
                                <span className="text-white">{formatCurrency(summary?.expenses || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="hero-card-gradient p-6 relative overflow-hidden group rounded-[24px]">
                    <div className="absolute right-0 top-0 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Activity className="w-32 h-32 text-emerald-300 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-emerald-300 uppercase tracking-widest mb-1">NET KÂR</p>
                        <h2 className="text-5xl font-bold text-white font-[Space_Grotesk] text-neon-glow">
                            {loadingSummary ? <Skeleton className="h-12 w-40 bg-white/10" /> : formatCurrency(summary?.netProfit || 0)}
                        </h2>
                        <div className="mt-4 flex items-center text-xs text-emerald-200/70">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Net Ciro - Toplam Giderler
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income List (Student Payments) */}
                <div className="glass-card p-6 min-h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white font-[Space_Grotesk] flex items-center gap-2">
                            <ArrowDownRight className="text-emerald-400" />
                            Gelir Akışı
                        </h3>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-none">
                            {summary?.breakdown?.income.length || 0} İşlem
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {loadingSummary ? (
                            [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />)
                        ) : summary?.breakdown?.income.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Bu tarih aralığında gelir kaydı yok.</div>
                        ) : (
                            summary?.breakdown?.income.slice(0, 10).map((item: any, idx: number) => (
                                <div key={idx} className="floating-row p-4 flex items-center justify-between group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">Öğrenci Ödemesi</p>
                                            <p className="text-xs text-gray-400">{format(new Date(item.paymentDate), "d MMMM yyyy", { locale: tr })}</p>
                                        </div>
                                    </div>
                                    <span className="text-emerald-400 font-bold font-mono tracking-wide">
                                        +{formatCurrency(parseFloat(item.amount))}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Expense List */}
                <div className="glass-card p-6 min-h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white font-[Space_Grotesk] flex items-center gap-2">
                            <ArrowUpRight className="text-purple-400" />
                            Gider Listesi
                        </h3>
                        <Badge className="bg-purple-500/10 text-purple-400 border-none">
                            {expenses?.length || 0} İşlem
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {loadingExpenses ? (
                            [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl" />)
                        ) : expenses?.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Bu tarih aralığında gider kaydı yok.</div>
                        ) : (
                            expenses?.map((expense: any) => (
                                <div key={expense.id} className="floating-row p-4 flex items-center justify-between group cursor-pointer border-l-2 border-l-purple-500/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white">{expense.description}</span>
                                            <span className="text-xs text-gray-400 capitalize">{expense.category} • {format(new Date(expense.date), "d MMMM yyyy", { locale: tr })}</span>
                                        </div>
                                    </div>
                                    <span className="text-red-400 font-bold font-mono tracking-wide">
                                        -{formatCurrency(parseFloat(expense.amount))}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <AddExpenseDialog open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} />
        </div>
    );
}
