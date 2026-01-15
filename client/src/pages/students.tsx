import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Search, ArrowRightLeft, RefreshCw, Download, Trash2, UserPlus, Filter } from "lucide-react";
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
import { StudentDialog } from "@/components/student-dialog";
import { TransferCoachDialog } from "@/components/transfer-coach-dialog";
import { SmartRenewDialog } from "@/components/smart-renew-dialog";
import { ArchiveStudentDialog } from "@/components/archive-student-dialog";
import type { StudentWithCoach } from "@shared/schema";
import { format, differenceInDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

type PackageStatus = "active" | "expiring" | "expired";

function getPackageStatus(endDate: string): PackageStatus {
  const daysRemaining = differenceInDays(parseISO(endDate), new Date());
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 7) return "expiring";
  return "active";
}

function DaysRemainingBadge({ endDate }: { endDate: string }) {
  const daysRemaining = differenceInDays(parseISO(endDate), new Date());

  if (daysRemaining < 0) {
    return (
      <Badge variant="outline" className="bg-status-busy/10 text-status-busy border-status-busy/30 shadow-[0_0_10px_hsl(var(--status-busy)/0.2)]">
        {Math.abs(daysRemaining)} gün gecikti
      </Badge>
    );
  }
  if (daysRemaining <= 7) {
    return (
      <Badge variant="outline" className="bg-status-away/10 text-status-away border-status-away/30 shadow-[0_0_10px_hsl(var(--status-away)/0.2)]">
        {daysRemaining} gün kaldı
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-status-online/10 text-status-online border-status-online/30 shadow-[0_0_10px_hsl(var(--status-online)/0.2)]">
      {daysRemaining} gün kaldı
    </Badge>
  );
}

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<
    StudentWithCoach | undefined
  >();

  const { data: students, isLoading } = useQuery<StudentWithCoach[]>({
    queryKey: ["/api/students"],
  });

  const filteredStudents = students?.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      student.coach.firstName.toLowerCase().includes(searchLower) ||
      student.coach.lastName.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (student: StudentWithCoach) => {
    setSelectedStudent(student);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStudent(undefined);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedStudent(undefined);
  };

  const handleTransferCoach = (student: StudentWithCoach) => {
    setSelectedStudent(student);
    setTransferDialogOpen(true);
  };

  const handleTransferClose = () => {
    setTransferDialogOpen(false);
    setSelectedStudent(undefined);
  };

  const handleRenew = (student: StudentWithCoach) => {
    setSelectedStudent(student);
    setRenewDialogOpen(true);
  };

  const handleRenewClose = () => {
    setRenewDialogOpen(false);
    setSelectedStudent(undefined);
  };

  const handleArchive = (student: StudentWithCoach) => {
    setSelectedStudent(student);
    setArchiveDialogOpen(true);
  };

  const handleArchiveClose = () => {
    setArchiveDialogOpen(false);
    setSelectedStudent(undefined);
  };

  const handleExport = () => {
    window.open("/api/export/students", "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient-neon mb-2">
            Öğrenci Yönetimi
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Tüm öğrencilerinizi ve paket durumlarını buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-students"
            className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel'e Aktar
          </Button>
          <Button
            onClick={handleAdd}
            data-testid="button-add-student"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Öğrenci Ekle
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-xl flex items-center gap-4 glow-sm">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary/10 rounded-lg">
            <Search className="w-4 h-4 text-primary" />
          </div>
          <Input
            placeholder="Öğrenci adı, koç veya e-posta ile arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-12 bg-background/50 border-input/50 focus:ring-primary/50 text-base"
            data-testid="input-search-students"
          />
        </div>
        <div className="h-8 w-[1px] bg-border mx-2" />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="glass-card rounded-xl overflow-hidden shadow-2xl border-none">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/10 border-b border-primary/10">
              <TableHead className="font-semibold text-primary/80">Öğrenci Adı</TableHead>
              <TableHead className="font-semibold text-primary/80">E-posta</TableHead>
              <TableHead className="font-semibold text-primary/80">Atanan Koç</TableHead>
              <TableHead className="font-semibold text-primary/80">Paket</TableHead>
              <TableHead className="font-semibold text-primary/80">Başlangıç</TableHead>
              <TableHead className="font-semibold text-primary/80">Bitiş</TableHead>
              <TableHead className="font-semibold text-primary/80">Durum</TableHead>
              <TableHead className="text-right font-semibold text-primary/80">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-white/5">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full bg-white/5" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredStudents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <UserPlus className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg">Kayıtlı öğrenci bulunamadı.</p>
                    <p className="text-sm opacity-60">Yeni bir öğrenci ekleyerek başlayabilirsiniz.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents?.map((student, index) => {
                return (
                  <TableRow
                    key={student.id}
                    className={`
                      border-b border-white/5 transition-colors hover:bg-white/5
                      ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                    `}
                    data-testid={`student-row-${student.id}`}
                  >
                    <TableCell className="font-medium text-foreground">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {student.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/70">
                        {student.coach.firstName} {student.coach.lastName}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{student.packageMonths} Ay</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(parseISO(student.packageStartDate), "dd.MM.yyyy", {
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(parseISO(student.packageEndDate), "dd.MM.yyyy", {
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell>
                      <DaysRemainingBadge endDate={student.packageEndDate} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRenew(student)}
                          data-testid={`button-renew-package-${student.id}`}
                          title="Paket Yenile"
                          className="hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTransferCoach(student)}
                          data-testid={`button-transfer-coach-${student.id}`}
                          title="Koç Değiştir"
                          className="hover:text-accent hover:bg-accent/10 transition-colors"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                          data-testid={`button-edit-student-${student.id}`}
                          title="Düzenle"
                          className="hover:text-warning hover:bg-warning/10 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleArchive(student)}
                          data-testid={`button-archive-student-${student.id}`}
                          title="Arşivle"
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <StudentDialog
        open={dialogOpen}
        onClose={handleClose}
        student={selectedStudent}
      />

      <TransferCoachDialog
        open={transferDialogOpen}
        onClose={handleTransferClose}
        student={selectedStudent}
      />

      <SmartRenewDialog
        open={renewDialogOpen}
        onClose={handleRenewClose}
        student={selectedStudent}
      />

      <ArchiveStudentDialog
        open={archiveDialogOpen}
        onClose={handleArchiveClose}
        student={selectedStudent}
      />
    </div>
  );
}
