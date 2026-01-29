import {
  coaches,
  students,
  systemSettings,
  paymentRecords,
  coachTransfers,
  studentPayments,
  coachPayrolls,
  type Coach,
  type InsertCoach,
  type Student,
  type InsertStudent,
  type StudentWithCoach,
  type CoachWithStudents,
  type SystemSettings,
  type InsertSystemSettings,
  type PaymentRecord,
  type InsertPaymentRecord,
  type CoachTransfer,
  type InsertCoachTransfer,
  type StudentPayment,
  type InsertStudentPayment,
  type CoachPayroll,
  type InsertCoachPayroll,
  type RenewStudentPackage,
  type SmartRenewalRequest,
  type StudentStatus,
  expenses,
  users,
  type User,
  type InsertUser,
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, sql, desc, asc, lte, gte } from "drizzle-orm";
import { addMonths, format, differenceInDays, parseISO, max } from "date-fns";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  // System Settings
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: InsertSystemSettings): Promise<SystemSettings>;
  initializeSettings(): Promise<void>;

  // Users (Auth)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;


  // Coaches
  getAllCoaches(): Promise<CoachWithStudents[]>;
  getCoach(id: string): Promise<CoachWithStudents | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach>;
  archiveCoach(id: string): Promise<void>;

  // Students
  getAllStudents(): Promise<StudentWithCoach[]>;
  getStudent(id: string): Promise<StudentWithCoach | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  archiveStudent(id: string, leaveDate: string): Promise<void>;

  // Payment Records
  createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord>;
  getPaymentRecordsByCoach(coachId: string): Promise<PaymentRecord[]>;
  getAllPaymentRecords(): Promise<PaymentRecord[]>;
  markPaymentAsPaid(id: string, paidBy?: string, notes?: string): Promise<PaymentRecord>;
  getPaymentRecord(id: string): Promise<PaymentRecord | undefined>;

  // Coach Transfers
  createCoachTransfer(transfer: InsertCoachTransfer): Promise<CoachTransfer>;
  getStudentTransferHistory(studentId: string): Promise<CoachTransfer[]>;
  transferStudentCoach(studentId: string, newCoachId: string, transferDate: string, notes?: string): Promise<CoachTransfer>;

  // Student Payments (Package Renewals)
  createStudentPayment(payment: InsertStudentPayment): Promise<StudentPayment>;
  getStudentPaymentHistory(studentId: string): Promise<StudentPayment[]>;
  getLastStudentPayment(studentId: string): Promise<StudentPayment | undefined>;
  renewStudentPackage(studentId: string, renewal: RenewStudentPackage): Promise<{ student: Student; payment: StudentPayment }>;
  smartRenewStudentPackage(studentId: string, renewal: SmartRenewalRequest): Promise<{ student: Student; payment: StudentPayment; mode: string }>;

  // Coach Payrolls (Period-based payments)
  getCoachPayroll(coachId: string, periodMonth: string): Promise<CoachPayroll | undefined>;
  getCoachPayrollsByPeriod(periodMonth: string): Promise<CoachPayroll[]>;
  getAllCoachPayrolls(): Promise<CoachPayroll[]>;
  createOrUpdateCoachPayroll(payroll: InsertCoachPayroll): Promise<CoachPayroll>;
  markCoachPayrollAsPaid(id: string, paidBy?: string, notes?: string, transferFee?: number): Promise<CoachPayroll>;

  // Dashboard stats
  getOverdueStudentCount(): Promise<number>;
  getPendingPayrollTotal(): Promise<string>;

  // Financial summary (income/expense/profit)
  getFinancialSummary(): Promise<{ totalIncome: string; totalExpense: string; netProfit: string }>;

  // NEW: Comprehensive Financial Summary
  getFinancialSummaryByDateRange(startDate: string, endDate: string): Promise<{
    revenue: number;
    netRevenue: number;
    coachCost: number;
    expenses: number;
    netProfit: number;
    breakdown: {
      income: StudentPayment[];
      expenses: any[];
    }
  }>;

  // Expenses
  createExpense(expense: any): Promise<any>;
  getExpenses(startDate: string, endDate: string): Promise<any[]>;
  deleteExpense(id: string): Promise<void>;

  // Analytics for Charts
  getFinancialHistory(months: number): Promise<{ month: string; revenue: number; expense: number; profit: number }[]>;

  // Historical queries (include archived for payroll calculations)
  getAllStudentsIncludingArchived(): Promise<StudentWithCoach[]>;
  getAllCoachesIncludingArchived(): Promise<CoachWithStudents[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: false, // Drizzle manages the table creation
      tableName: "sessions", // Match the Drizzle schema table name
    });
  }

  // System Settings
  async getSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      await this.initializeSettings();
      const [newSettings] = await db.select().from(systemSettings).limit(1);
      return newSettings;
    }
    return settings;
  }

  async updateSettings(
    settingsData: InsertSystemSettings
  ): Promise<SystemSettings> {
    const existing = await this.getSettings();
    const [updated] = await db
      .update(systemSettings)
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, existing.id))
      .returning();
    return updated;
  }

  async initializeSettings(): Promise<void> {
    await db.insert(systemSettings).values({
      coachMonthlyFee: "1100.00",
      baseDays: 31,
      globalPaymentDay: 28,
    }).onConflictDoNothing();
  }

  // Users (Auth)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }


  // Coaches
  async getAllCoaches(): Promise<CoachWithStudents[]> {
    const allCoaches = await db.query.coaches.findMany({
      where: eq(coaches.isActive, 1),
      with: {
        students: {
          where: eq(students.isActive, 1),
        },
      },
      orderBy: [asc(coaches.firstName)],
    });
    return allCoaches;
  }

  async getCoach(id: string): Promise<CoachWithStudents | undefined> {
    const coach = await db.query.coaches.findFirst({
      where: and(eq(coaches.id, id), eq(coaches.isActive, 1)),
      with: {
        students: {
          where: eq(students.isActive, 1),
        },
      },
    });
    return coach;
  }

  async createCoach(coachData: InsertCoach): Promise<Coach> {
    const [coach] = await db
      .insert(coaches)
      .values({
        ...coachData,
        isActive: 1,
      })
      .returning();
    return coach;
  }

  async updateCoach(
    id: string,
    coachData: Partial<InsertCoach>
  ): Promise<Coach> {
    const [updated] = await db
      .update(coaches)
      .set({
        ...coachData,
        updatedAt: new Date(),
      })
      .where(eq(coaches.id, id))
      .returning();
    return updated;
  }

  async archiveCoach(id: string): Promise<void> {
    await db
      .update(coaches)
      .set({
        isActive: 0,
        updatedAt: new Date(),
      })
      .where(eq(coaches.id, id));
  }

  // Students
  async getAllStudents(): Promise<StudentWithCoach[]> {
    const allStudents = await db.query.students.findMany({
      where: eq(students.isActive, 1),
      with: {
        coach: true,
      },
      orderBy: [desc(students.createdAt)],
    });
    return allStudents;
  }

  async getStudent(id: string): Promise<StudentWithCoach | undefined> {
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, id), eq(students.isActive, 1)),
      with: {
        coach: true,
      },
    });
    return student;
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    // Calculate package end date
    const startDate = new Date(studentData.packageStartDate);
    const endDate = addMonths(startDate, studentData.packageMonths);
    const packageEndDate = format(endDate, "yyyy-MM-dd");

    // Extract initialPayment before inserting student (it's not a column in students table)
    const { initialPayment, ...studentInsertData } = studentData;

    // Only set lastPaymentDate if there's an actual payment
    const hasPayment = initialPayment && parseFloat(initialPayment) > 0;

    const [student] = await db
      .insert(students)
      .values({
        ...studentInsertData,
        packageEndDate,
        lastPaymentDate: hasPayment ? studentData.packageStartDate : null,
        isActive: 1,
      })
      .returning();

    // If initial payment is provided, create a payment record
    if (hasPayment) {
      await db
        .insert(studentPayments)
        .values({
          studentId: student.id,
          amount: initialPayment,
          paymentDate: studentData.packageStartDate,
          packageDurationMonths: studentData.packageMonths,
          previousEndDate: null, // First payment, no previous end date
          newEndDate: packageEndDate,
          notes: "İlk kayıt ödemesi",
          recordedBy: "Admin",
        });
    }

    return student;
  }

  async updateStudent(
    id: string,
    studentData: Partial<InsertStudent>
  ): Promise<Student> {
    // Recalculate end date if start date or package months changed
    let packageEndDate: string | undefined;
    if (studentData.packageStartDate || studentData.packageMonths !== undefined) {
      const existing = await db.query.students.findFirst({
        where: eq(students.id, id),
      });
      if (!existing) throw new Error("Student not found");

      const startDate = new Date(
        studentData.packageStartDate || existing.packageStartDate
      );
      const months =
        studentData.packageMonths !== undefined
          ? studentData.packageMonths
          : existing.packageMonths;
      const endDate = addMonths(startDate, months);
      packageEndDate = format(endDate, "yyyy-MM-dd");
    }

    const [updated] = await db
      .update(students)
      .set({
        ...studentData,
        ...(packageEndDate ? { packageEndDate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning();
    return updated;
  }

  async archiveStudent(id: string, leaveDate: string): Promise<void> {
    // When archiving a student with a leave date, we must:
    // 1. Set status to archived
    // 2. Set packageEndDate to the leaveDate (so they stop accruing cost/payment for coach)

    await db
      .update(students)
      .set({
        isActive: 0,
        status: "archived",
        packageEndDate: leaveDate, // Critical: Stops calculations effectively.
        updatedAt: new Date(),
      })
      .where(eq(students.id, id));
  }

  // Payment Records
  async createPaymentRecord(
    record: InsertPaymentRecord
  ): Promise<PaymentRecord> {
    const [paymentRecord] = await db
      .insert(paymentRecords)
      .values(record)
      .returning();
    return paymentRecord;
  }

  async getPaymentRecordsByCoach(coachId: string): Promise<PaymentRecord[]> {
    const records = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.coachId, coachId))
      .orderBy(sql`${paymentRecords.paymentDate} DESC`);
    return records;
  }

  async getAllPaymentRecords(): Promise<PaymentRecord[]> {
    const records = await db
      .select()
      .from(paymentRecords)
      .orderBy(sql`${paymentRecords.paymentDate} DESC, ${paymentRecords.createdAt} DESC`);
    return records;
  }

  async markPaymentAsPaid(
    id: string,
    paidBy?: string,
    notes?: string
  ): Promise<PaymentRecord> {
    const [updated] = await db
      .update(paymentRecords)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidBy,
        notes,
      })
      .where(eq(paymentRecords.id, id))
      .returning();
    return updated;
  }

  async getPaymentRecord(id: string): Promise<PaymentRecord | undefined> {
    const [record] = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.id, id))
      .limit(1);
    return record;
  }

  // Coach Transfers
  async createCoachTransfer(transfer: InsertCoachTransfer): Promise<CoachTransfer> {
    const [coachTransfer] = await db
      .insert(coachTransfers)
      .values(transfer)
      .returning();
    return coachTransfer;
  }

  async getStudentTransferHistory(studentId: string): Promise<CoachTransfer[]> {
    const transfers = await db
      .select()
      .from(coachTransfers)
      .where(eq(coachTransfers.studentId, studentId))
      .orderBy(sql`${coachTransfers.transferDate} DESC`);
    return transfers;
  }

  async transferStudentCoach(
    studentId: string,
    newCoachId: string,
    transferDate: string,
    notes?: string
  ): Promise<CoachTransfer> {
    // Get current student data
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      throw new Error("Student not found");
    }

    const oldCoachId = student.coachId;

    // Create transfer record
    const [transfer] = await db
      .insert(coachTransfers)
      .values({
        studentId,
        oldCoachId,
        newCoachId,
        transferDate,
        notes,
      })
      .returning();

    // Update student's current coach
    await db
      .update(students)
      .set({
        coachId: newCoachId,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));

    return transfer;
  }

  // Student Payments (Package Renewals)
  async createStudentPayment(payment: InsertStudentPayment): Promise<StudentPayment> {
    const [studentPayment] = await db
      .insert(studentPayments)
      .values(payment)
      .returning();
    return studentPayment;
  }

  async getStudentPaymentHistory(studentId: string): Promise<StudentPayment[]> {
    const payments = await db
      .select()
      .from(studentPayments)
      .where(eq(studentPayments.studentId, studentId))
      .orderBy(desc(studentPayments.paymentDate));
    return payments;
  }

  async renewStudentPackage(
    studentId: string,
    renewal: RenewStudentPackage
  ): Promise<{ student: Student; payment: StudentPayment }> {
    // Get current student
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      throw new Error("Student not found");
    }

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const paymentDate = renewal.paymentDate || todayStr;

    // Calculate new end date
    // If package is expired, start from today; otherwise extend from current end date
    const currentEndDate = new Date(student.packageEndDate);
    const baseDate = currentEndDate < today ? today : currentEndDate;
    const newEndDate = addMonths(baseDate, renewal.packageMonths);
    const newEndDateStr = format(newEndDate, "yyyy-MM-dd");

    // Create payment record
    const [payment] = await db
      .insert(studentPayments)
      .values({
        studentId,
        amount: renewal.amount,
        paymentDate,
        packageDurationMonths: renewal.packageMonths,
        previousEndDate: student.packageEndDate,
        newEndDate: newEndDateStr,
        notes: renewal.notes,
        recordedBy: "Admin",
      })
      .returning();

    // Update student - IMPORTANT: startDate NEVER changes
    const [updatedStudent] = await db
      .update(students)
      .set({
        packageEndDate: newEndDateStr,
        packageMonths: renewal.packageMonths, // Update to latest package duration
        status: "active" as StudentStatus,
        lastPaymentDate: paymentDate,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return { student: updatedStudent, payment };
  }

  async getLastStudentPayment(studentId: string): Promise<StudentPayment | undefined> {
    const [lastPayment] = await db
      .select()
      .from(studentPayments)
      .where(eq(studentPayments.studentId, studentId))
      .orderBy(desc(studentPayments.paymentDate))
      .limit(1);
    return lastPayment;
  }

  async smartRenewStudentPackage(
    studentId: string,
    renewal: SmartRenewalRequest
  ): Promise<{ student: Student; payment: StudentPayment; mode: string }> {
    // Get current student
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      throw new Error("Öğrenci bulunamadı");
    }

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const paymentDate = renewal.paymentDate || todayStr;

    let amount: string;
    let packageMonths: number;
    let modeUsed = renewal.mode;

    // Handle different renewal modes
    if (renewal.mode === "quick") {
      // Quick mode: Use last payment data or current student data
      const lastPayment = await this.getLastStudentPayment(studentId);

      if (lastPayment) {
        amount = lastPayment.amount;
        packageMonths = lastPayment.packageDurationMonths;
      } else {
        // No previous payment, use current package months and throw error for amount
        throw new Error("Son ödeme kaydı bulunamadı. Lütfen 'Fiyat Güncelleme' veya 'Paket Değişikliği' seçeneğini kullanın.");
      }
    } else if (renewal.mode === "price_update") {
      // Price update mode: Same package duration, new price
      const lastPayment = await this.getLastStudentPayment(studentId);
      packageMonths = lastPayment?.packageDurationMonths || student.packageMonths;
      amount = renewal.amount;
    } else {
      // Package switch mode: New package duration and price
      packageMonths = renewal.packageMonths;
      amount = renewal.amount;
    }

    // Calculate new end date
    // If package is expired, start from today; otherwise extend from current end date
    const currentEndDate = new Date(student.packageEndDate);
    const baseDate = currentEndDate < today ? today : currentEndDate;
    const newEndDate = addMonths(baseDate, packageMonths);
    const newEndDateStr = format(newEndDate, "yyyy-MM-dd");

    // Create payment record
    const [payment] = await db
      .insert(studentPayments)
      .values({
        studentId,
        amount,
        paymentDate,
        packageDurationMonths: packageMonths,
        previousEndDate: student.packageEndDate,
        newEndDate: newEndDateStr,
        notes: renewal.notes,
        recordedBy: "Admin",
      })
      .returning();

    // Update student
    const [updatedStudent] = await db
      .update(students)
      .set({
        packageEndDate: newEndDateStr,
        packageMonths: packageMonths,
        status: "active" as StudentStatus,
        lastPaymentDate: paymentDate,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))
      .returning();

    return { student: updatedStudent, payment, mode: modeUsed };
  }

  // Coach Payrolls (Period-based payments)
  async getCoachPayroll(coachId: string, periodMonth: string): Promise<CoachPayroll | undefined> {
    const [payroll] = await db
      .select()
      .from(coachPayrolls)
      .where(and(
        eq(coachPayrolls.coachId, coachId),
        eq(coachPayrolls.periodMonth, periodMonth)
      ))
      .limit(1);
    return payroll;
  }

  async getCoachPayrollsByPeriod(periodMonth: string): Promise<CoachPayroll[]> {
    const payrolls = await db
      .select()
      .from(coachPayrolls)
      .where(eq(coachPayrolls.periodMonth, periodMonth))
      .orderBy(desc(coachPayrolls.totalAmount));
    return payrolls;
  }

  async getAllCoachPayrolls(): Promise<CoachPayroll[]> {
    const payrolls = await db
      .select()
      .from(coachPayrolls)
      .orderBy(desc(coachPayrolls.periodMonth), desc(coachPayrolls.totalAmount));
    return payrolls;
  }

  async createOrUpdateCoachPayroll(payroll: InsertCoachPayroll): Promise<CoachPayroll> {
    // Check if payroll exists for this coach and period
    const existing = await this.getCoachPayroll(payroll.coachId, payroll.periodMonth);

    if (existing) {
      // If already paid, don't update
      if (existing.status === "paid") {
        return existing;
      }

      // Update existing payroll
      const [updated] = await db
        .update(coachPayrolls)
        .set({
          totalAmount: payroll.totalAmount,
          studentCount: payroll.studentCount,
          breakdown: payroll.breakdown,
          calculatedAt: new Date(),
        })
        .where(eq(coachPayrolls.id, existing.id))
        .returning();
      return updated;
    }

    // Create new payroll
    const [newPayroll] = await db
      .insert(coachPayrolls)
      .values({
        ...payroll,
        calculatedAt: new Date(),
      })
      .returning();
    return newPayroll;
  }

  async markCoachPayrollAsPaid(
    id: string,
    paidBy?: string,
    notes?: string,
    transferFee?: number
  ): Promise<CoachPayroll> {
    // Handle transfer fee logic
    if (transferFee && transferFee > 0) {
      await db.insert(expenses).values({
        description: `Maaş Ödemesi Havale Bedeli (Bordro #${id})`,
        amount: transferFee.toString(),
        category: 'transfer_fee',
        date: new Date().toISOString().split('T')[0],
        notes: `Bordro ID: ${id}`
      });
    }

    const [updated] = await db
      .update(coachPayrolls)
      .set({
        status: "paid",
        paymentDate: new Date(),
        paidBy,
        notes,
      })
      .where(eq(coachPayrolls.id, id))
      .returning();
    return updated;
  }

  // Dashboard stats
  async getOverdueStudentCount(): Promise<number> {
    const today = format(new Date(), "yyyy-MM-dd");
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(and(
        eq(students.isActive, 1),
        lte(students.packageEndDate, today)
      ));
    return Number(result[0]?.count || 0);
  }

  async getPendingPayrollTotal(): Promise<string> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(coachPayrolls)
      .where(eq(coachPayrolls.status, "pending"));
    return result[0]?.total || "0";
  }

  // Historical queries (include archived for payroll calculations)
  async getAllStudentsIncludingArchived(): Promise<StudentWithCoach[]> {
    const allStudents = await db.query.students.findMany({
      with: {
        coach: true,
      },
      orderBy: [desc(students.createdAt)],
    });
    return allStudents;
  }

  async getAllCoachesIncludingArchived(): Promise<CoachWithStudents[]> {
    const allCoaches = await db.query.coaches.findMany({
      with: {
        students: true, // Include all students, even archived ones
      },
      orderBy: [asc(coaches.firstName)],
    });
    return allCoaches;
  }

  // Financial summary: Total Income - Total Expense = Net Profit
  async getFinancialSummary(): Promise<{ totalIncome: string; totalExpense: string; netProfit: string }> {
    // Get total income from student payments
    const incomeResult = await db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(studentPayments);
    const totalIncome = parseFloat(incomeResult[0]?.total || "0");

    // Get total expense from coach payrolls (paid only)
    const expenseResult = await db
      .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(coachPayrolls)
      .where(eq(coachPayrolls.status, "paid"));
    const totalExpense = parseFloat(expenseResult[0]?.total || "0");

    const netProfit = totalIncome - totalExpense;

    return {
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netProfit: netProfit.toFixed(2),
    };
  }

  // Expenses
  async createExpense(expense: any): Promise<any> {
    // Import expenses table dynamically or move import to top (assuming it's in shared/schema)
    // For now we assume imports are done. Note: I added 'expenses' to schema previously.
    // However, I need to import it here. Since I can't easily edit top of file, 
    // I will use direct SQL or assume 'expenses' is available if I added it to imports.
    // Let's modify the top imports first in a separate check? 
    // No, I will assume 'expenses' is available via @shared/schema import at top.

    // Actually, I need to add 'expenses' to the import list at the top of the file
    // But since I am replacing *this* block, I can't reach the top.
    // I will rely on the fact that I can't add imports easily without replacing the whole file header.
    // WAIT: I *can* use db.insert(expenses) if I import it.
    // Hack: I'll use `import { expenses } from "@shared/schema"` logic by assuming it's done or I'll fix imports in another step.
    // Wait, I am editing `storage.ts`. I should make sure imports are correct.
    // I will skip the import fix here and do it in a separate call if needed, 
    // but the code below will fail if 'expenses' is not imported.
    // I'll trust the user/agent will fix imports or I will try to patch imports in a separate call.

    // ... Actually, I can replace the import block at the top too!
    // But multi_replace is for non-contiguous edits. I can do it!

    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpenses(startDate: string, endDate: string): Promise<any[]> {
    return await db.select().from(expenses)
      .where(and(
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      ))
      .orderBy(desc(expenses.date));
  }

  // FULL IMPLEMENTATION OF getFinancialSummaryByDateRange
  async getFinancialSummaryByDateRange(startDate: string, endDate: string): Promise<{
    revenue: number;
    netRevenue: number;
    coachCost: number;
    expenses: number;
    netProfit: number;
    breakdown: {
      income: StudentPayment[];
      expenses: any[];
    }
  }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Revenue: Student Payments in range
    const incomePayments = await db
      .select()
      .from(studentPayments)
      .where(and(
        gte(studentPayments.paymentDate, startDate),
        lte(studentPayments.paymentDate, endDate)
      ));

    const revenue = incomePayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

    // 2. Net Revenue: 6% Commission Deduction
    // User requested: "2500 TL'den %6 düştü" -> This implies Revenue * 0.94
    const netRevenue = revenue * 0.94;

    // 3. Coach Cost: Accrued Liability for the period
    // We need to calculate how much the coaches "earned" (hak ediş) in this date range.
    // Formula: Sum(ActiveDays * DailyRate) for all students.

    const settings = await this.getSettings();
    const monthlyFee = parseFloat(settings.coachMonthlyFee);
    const baseDays = settings.baseDays;
    const dailyRate = monthlyFee / baseDays;

    let totalCoachCost = 0;

    // REVISED COST LOGIC (User Request: "Immediately deduct coach cost for new sales/renewals")
    // Instead of Accrual (Daily Rate * Active Days), we use Transactional Cost (Coach Monthly Fee per Transaction)
    // Assumption: Each payment represents 1 month of service.

    // Iterate through INCOME PAYMENTS (not students) to calculate cost
    for (const payment of incomePayments) {
      // Find the student to check if they have a coach (though payments imply active student)
      // Since we don't have student join in payment query easily, we'll assume valid coach cost if active.
      // Better: Use packageDurationMonths if available, or default to 1 month.

      const durationMonths = payment.packageDurationMonths || 1;

      // Cost = Duration * CoachMonthlyFee
      // This is the "Estimated Liability" created at the moment of sale
      const liability = durationMonths * monthlyFee;

      totalCoachCost += liability;
    }

    // 4. Expenses: Manual Expenses
    const expenseRecords = await db
      .select({
        id: expenses.id,
        description: expenses.description,
        amount: expenses.amount,
        category: expenses.category,
        date: expenses.date,
        notes: expenses.notes
      })
      .from(expenses)
      .where(and(
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      ));

    const totalExpenses = expenseRecords.reduce((sum: number, e: { amount: string }) => sum + parseFloat(e.amount), 0);

    // 5. Net Profit
    // User: "Bana gelen para (NetRevenue) - Koça Çıkacak (CoachCost) - Giderler"
    const netProfit = netRevenue - totalCoachCost - totalExpenses;

    return {
      revenue,
      netRevenue,
      coachCost: totalCoachCost,
      expenses: totalExpenses,
      netProfit,
      breakdown: {
        income: incomePayments,
        expenses: expenseRecords
      }
    };
  }

  // ============ SECURITY LAYER: IDEMPOTENT BATCH PAYMENT DISTRIBUTION ============

  /**
   * SECURITY LAYER 1: Idempotency Check
   * Returns true if period is already paid (at least one paid payroll exists)
   * Prevents double-payment attacks (double-click, retry, etc.)
   */
  async isPeriodAlreadyPaid(periodMonth: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(coachPayrolls)
      .where(and(
        eq(coachPayrolls.periodMonth, periodMonth),
        eq(coachPayrolls.status, "paid")
      ));
    return Number(result[0]?.count || 0) > 0;
  }

  /**
   * SECURITY LAYER 2: Atomik Transaction ile Toplu Ödeme Dağıtımı
   * Ya hepsi ödenir ya hiçbiri - Yarım kalmış işlem olmaz
   * 
   * @param periodMonth - "2025-02" format
   * @param paidBy - Kim ödeme yaptı
   * @returns Ödeme raporu veya hata
   */
  async distributePayrollsWithTransaction(
    periodMonth: string,
    paidBy?: string
  ): Promise<{
    success: boolean;
    message: string;
    processedCount: number;
    totalAmount: string;
    skippedAlreadyPaid: number;
    details: Array<{ coachId: string; coachName: string; amount: string; status: string }>;
  }> {
    // SECURITY CHECK 1: Idempotency - Dönem zaten ödendi mi?
    const alreadyPaid = await this.isPeriodAlreadyPaid(periodMonth);
    if (alreadyPaid) {
      return {
        success: false,
        message: `HATA: ${periodMonth} dönemi zaten ödenmiş. Çift ödeme engellendi.`,
        processedCount: 0,
        totalAmount: "0.00",
        skippedAlreadyPaid: 0,
        details: [],
      };
    }

    // Get all pending payrolls for this period
    const pendingPayrolls = await db
      .select()
      .from(coachPayrolls)
      .where(and(
        eq(coachPayrolls.periodMonth, periodMonth),
        eq(coachPayrolls.status, "pending")
      ));

    if (pendingPayrolls.length === 0) {
      return {
        success: true,
        message: `${periodMonth} döneminde bekleyen ödeme bulunamadı.`,
        processedCount: 0,
        totalAmount: "0.00",
        skippedAlreadyPaid: 0,
        details: [],
      };
    }

    // Get coach names for the report
    const allCoaches = await this.getAllCoachesIncludingArchived();
    const coachMap = new Map(allCoaches.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

    // SECURITY LAYER 2: Atomik Transaction - Ya hepsi ya hiçbiri
    try {
      const now = new Date();
      const details: Array<{ coachId: string; coachName: string; amount: string; status: string }> = [];
      let totalAmount = 0;

      // Update all pending payrolls in a single transaction
      await db.transaction(async (tx: any) => {
        for (const payroll of pendingPayrolls) {
          await tx
            .update(coachPayrolls)
            .set({
              status: "paid",
              paymentDate: now,
              paidBy: paidBy || "Admin",
              notes: `Toplu ödeme: ${periodMonth}`,
            })
            .where(eq(coachPayrolls.id, payroll.id));

          const amount = parseFloat(payroll.totalAmount);
          totalAmount += amount;

          details.push({
            coachId: payroll.coachId,
            coachName: coachMap.get(payroll.coachId) || "Bilinmeyen",
            amount: payroll.totalAmount,
            status: "paid",
          });
        }
      });

      return {
        success: true,
        message: `${pendingPayrolls.length} koça toplam ${totalAmount.toFixed(2)} TL ödeme başarıyla dağıtıldı.`,
        processedCount: pendingPayrolls.length,
        totalAmount: totalAmount.toFixed(2),
        skippedAlreadyPaid: 0,
        details,
      };
    } catch (error) {
      // Transaction başarısız - tüm değişiklikler geri alındı
      console.error("Toplu ödeme transaction hatası:", error);
      return {
        success: false,
        message: `Kritik hata: Transaction başarısız oldu, tüm değişiklikler geri alındı. Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        processedCount: 0,
        totalAmount: "0.00",
        skippedAlreadyPaid: 0,
        details: [],
      };
    }
  }

  /**
   * SECURITY LAYER 3: Hayalet Koç Kontrolü
   * 0 öğrencili koçlar için 0.00 TL bordro oluşturur
   * Sistemin çökmesini engeller
   */
  async createGhostCoachPayroll(
    coachId: string,
    periodMonth: string
  ): Promise<CoachPayroll> {
    const existing = await this.getCoachPayroll(coachId, periodMonth);
    if (existing) {
      return existing;
    }

    const [newPayroll] = await db
      .insert(coachPayrolls)
      .values({
        coachId,
        periodMonth,
        totalAmount: "0.00",
        studentCount: 0,
        breakdown: [],
        status: "pending",
        calculatedAt: new Date(),
      })
      .returning();

    return newPayroll;
  }

  /**
   * Get payroll count for a coach in a specific period
   * Used for idempotency check (should always be 0 or 1)
   */
  async getPayrollCountForCoachPeriod(coachId: string, periodMonth: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(coachPayrolls)
      .where(and(
        eq(coachPayrolls.coachId, coachId),
        eq(coachPayrolls.periodMonth, periodMonth)
      ));
    return Number(result[0]?.count || 0);
  }

  /**
   * Check if a specific payroll is locked (paid)
   */
  async isPayrollLocked(payrollId: string): Promise<boolean> {
    const payroll = await db
      .select({ status: coachPayrolls.status })
      .from(coachPayrolls)
      .where(eq(coachPayrolls.id, payrollId))
      .limit(1);
    return payroll[0]?.status === "paid";
  }

  /**
   * Lock a period completely (mark all as paid)
   * Returns false if already partially or fully locked
   */
  async lockPeriod(periodMonth: string, paidBy?: string): Promise<{
    success: boolean;
    message: string;
    lockedCount: number;
  }> {
    // Check if any payrolls are already paid
    const alreadyPaid = await this.isPeriodAlreadyPaid(periodMonth);
    if (alreadyPaid) {
      return {
        success: false,
        message: `${periodMonth} dönemi zaten kilitli (ödenmiş).`,
        lockedCount: 0,
      };
    }

    const result = await this.distributePayrollsWithTransaction(periodMonth, paidBy);
    return {
      success: result.success,
      message: result.message,
      lockedCount: result.processedCount,
    };
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getFinancialHistory(months: number): Promise<{ month: string; revenue: number; expense: number; profit: number }[]> {
    const history = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const date = addMonths(today, -i);
      // Ensure we get the full month for history
      // e.g. If today is Jan 16, and we want "January" history, we should probably look at full month stats?
      // Or maybe "Rolling 30 days" back?
      // Standard practice for "Monthly History" charts is Calendar Months.

      // Let's use Calendar Months relative to the current month.
      // i=0 -> Current Month (Jan)
      // i=1 -> Last Month (Dec)

      // Calculate start and end of that specific month
      const y = date.getFullYear();
      const m = date.getMonth();
      const startOfMonthDate = new Date(y, m, 1);
      const endOfMonthDate = new Date(y, m + 1, 0); // Last day of month

      const startStr = format(startOfMonthDate, "yyyy-MM-dd");
      const endStr = format(endOfMonthDate, "yyyy-MM-dd");

      // Reuse existing logic
      const summary = await this.getFinancialSummaryByDateRange(startStr, endStr);

      history.push({
        month: format(startOfMonthDate, "MMMM yyyy"), // e.g. "January 2026"
        revenue: summary.revenue,
        expense: summary.coachCost + summary.expenses, // Total expenses
        profit: summary.netProfit
      });
    }

    // Return reversed so oldest is first (for charts left-to-right)
    return history.reverse();
  }
}

export const storage = new DatabaseStorage();
