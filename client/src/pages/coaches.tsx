import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Search, Users, Download, UserCheck, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachDialog } from "@/components/coach-dialog";
import type { CoachWithStudents } from "@shared/schema";

export default function Coaches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<
    CoachWithStudents | undefined
  >();

  const { data: coaches, isLoading } = useQuery<CoachWithStudents[]>({
    queryKey: ["/api/coaches"],
  });

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const filteredCoaches = coaches?.filter((coach) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      coach.firstName.toLowerCase().includes(searchLower) ||
      coach.lastName.toLowerCase().includes(searchLower) ||
      coach.email.toLowerCase().includes(searchLower) ||
      coach.phone?.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: any = a;
    let bValue: any = b;

    if (sortConfig.key === 'activeStudents') {
      aValue = a.students?.filter(s => s.isActive === 1).length || 0;
      bValue = b.students?.filter(s => s.isActive === 1).length || 0;
    } else {
      aValue = aValue[sortConfig.key as keyof CoachWithStudents];
      bValue = bValue[sortConfig.key as keyof CoachWithStudents];
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const handleEdit = (coach: CoachWithStudents) => {
    setSelectedCoach(coach);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCoach(undefined);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedCoach(undefined);
  };

  const handleExport = () => {
    window.open("/api/export/coaches", "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient-neon mb-2">Koçlar</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Takımınızdaki tüm koçları ve performanslarını yönetin
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-coaches"
            className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel'e Aktar
          </Button>
          <Button
            onClick={handleAdd}
            data-testid="button-add-coach"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Koç Ekle
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl flex items-center gap-4 glow-sm">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary/10 rounded-lg">
            <Search className="w-4 h-4 text-primary" />
          </div>
          <Input
            placeholder="Koç adı, e-posta veya telefon ile arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-12 bg-background/50 border-input/50 focus:ring-primary/50 text-base"
            data-testid="input-search-coaches"
          />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden shadow-2xl border-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/10 border-b border-primary/10">
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("firstName")} className="hover:bg-transparent hover:text-primary p-0 h-auto font-semibold text-primary/80">
                  Koç Adı {getSortIcon("firstName")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("email")} className="hover:bg-transparent hover:text-primary p-0 h-auto font-semibold text-primary/80">
                  E-posta {getSortIcon("email")}
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-primary/80">Telefon</TableHead>
              <TableHead className="font-semibold text-primary/80">IBAN</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("activeStudents")} className="hover:bg-transparent hover:text-primary p-0 h-auto font-semibold text-primary/80">
                  Aktif Öğrenci {getSortIcon("activeStudents")}
                </Button>
              </TableHead>
              <TableHead className="text-right font-semibold text-primary/80">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-white/5">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full bg-white/5" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredCoaches?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg">Kayıtlı koç bulunamadı.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCoaches?.map((coach, index) => {
                const activeStudents = coach.students?.filter(
                  (s) => s.isActive === 1
                ).length || 0;
                const coachIban = (coach as any).iban;
                return (
                  <TableRow
                    key={coach.id}
                    className={`
                      border-b border-white/5 transition-colors hover:bg-white/5
                      ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                    `}
                    data-testid={`coach-row-${coach.id}`}
                  >
                    <TableCell className="font-medium text-foreground">
                      {coach.firstName} {coach.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {coach.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {coach.phone || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs opacity-70">
                      {coachIban ? coachIban.substring(0, 8) + "..." : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        gap-2 px-3 py-1 bg-white/5 border-white/10
                        ${activeStudents > 0 ? 'text-primary' : 'text-muted-foreground'}
                      `}>
                        <Users className="w-3 h-3" />
                        <span className="font-bold">{activeStudents}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(coach)}
                        data-testid={`button-edit-coach-${coach.id}`}
                        className="hover:text-warning hover:bg-warning/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CoachDialog open={dialogOpen} onClose={handleClose} coach={selectedCoach} />
    </div>
  );
}
