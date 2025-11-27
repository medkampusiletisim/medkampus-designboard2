import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  date,
  decimal,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// System settings table - stores global configuration
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachMonthlyFee: decimal("coach_monthly_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("1100.00"),
  baseDays: integer("base_days").notNull().default(31), // Base days for daily rate calculation
  globalPaymentDay: integer("global_payment_day").notNull().default(28),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coaches table (simplified - phone required)
export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(), // REQUIRED - NOT NULL
  iban: varchar("iban", { length: 50 }), // For payment transfers
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student status enum type
export type StudentStatus = "active" | "passive" | "archived";

// Students table (phone required)
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(), // REQUIRED - NOT NULL
  coachId: varchar("coach_id")
    .references(() => coaches.id)
    .notNull(),
  packageMonths: integer("package_months").notNull(), // 1-12 months
  packageStartDate: date("package_start_date").notNull(),
  packageEndDate: date("package_end_date").notNull(), // Auto-calculated
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, passive, archived
  lastPaymentDate: date("last_payment_date"), // Last time student made a payment
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = archived (legacy, kept for compatibility)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Payments table - tracks student package payments/renewals
export const studentPayments = pgTable("student_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .references(() => students.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  packageDurationMonths: integer("package_duration_months").notNull(),
  previousEndDate: date("previous_end_date"), // End date before renewal
  newEndDate: date("new_end_date").notNull(), // New end date after renewal
  notes: text("notes"),
  recordedBy: varchar("recorded_by", { length: 255 }), // Who recorded this payment
  createdAt: timestamp("created_at").defaultNow(),
});

// Coach Payrolls table - monthly payroll tracking for coaches
export const coachPayrolls = pgTable("coach_payrolls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id")
    .references(() => coaches.id)
    .notNull(),
  periodMonth: varchar("period_month", { length: 7 }).notNull(), // Format: "2025-11"
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  studentCount: integer("student_count").notNull(),
  breakdown: jsonb("breakdown").notNull(), // Array of {studentId, studentName, amount, daysWorked, periods}
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid
  calculatedAt: timestamp("calculated_at").defaultNow(),
  paymentDate: timestamp("payment_date"), // When the payment was actually made
  paidBy: varchar("paid_by", { length: 255 }), // Who marked it as paid
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent double-counting: one payroll entry per coach per period
  uniqueIndex("IDX_coach_payroll_unique").on(table.coachId, table.periodMonth),
]);

// Coach transfers table - tracks when students change coaches
export const coachTransfers = pgTable("coach_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .references(() => students.id)
    .notNull(),
  oldCoachId: varchar("old_coach_id")
    .references(() => coaches.id)
    .notNull(),
  newCoachId: varchar("new_coach_id")
    .references(() => coaches.id)
    .notNull(),
  transferDate: date("transfer_date").notNull(), // When the transfer happened
  notes: text("notes"), // Optional notes about the transfer
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment records table - stores historical coach payments
export const paymentRecords = pgTable("payment_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id")
    .references(() => coaches.id)
    .notNull(),
  paymentDate: date("payment_date").notNull(), // The global payment day when this was calculated
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  studentCount: integer("student_count").notNull(),
  breakdown: jsonb("breakdown").notNull(), // Array of {studentId, studentName, amount, daysWorked}
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid
  paidAt: timestamp("paid_at"), // When the payment was marked as completed
  paidBy: varchar("paid_by", { length: 255 }), // Who marked it as paid (for future use)
  notes: text("notes"), // Optional payment notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const coachesRelations = relations(coaches, ({ many }) => ({
  students: many(students),
  paymentRecords: many(paymentRecords),
  coachPayrolls: many(coachPayrolls),
  transfersFrom: many(coachTransfers, { relationName: "oldCoach" }),
  transfersTo: many(coachTransfers, { relationName: "newCoach" }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  coach: one(coaches, {
    fields: [students.coachId],
    references: [coaches.id],
  }),
  coachTransfers: many(coachTransfers),
  studentPayments: many(studentPayments),
}));

export const studentPaymentsRelations = relations(studentPayments, ({ one }) => ({
  student: one(students, {
    fields: [studentPayments.studentId],
    references: [students.id],
  }),
}));

export const coachPayrollsRelations = relations(coachPayrolls, ({ one }) => ({
  coach: one(coaches, {
    fields: [coachPayrolls.coachId],
    references: [coaches.id],
  }),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  coach: one(coaches, {
    fields: [paymentRecords.coachId],
    references: [coaches.id],
  }),
}));

export const coachTransfersRelations = relations(coachTransfers, ({ one }) => ({
  student: one(students, {
    fields: [coachTransfers.studentId],
    references: [students.id],
  }),
  oldCoach: one(coaches, {
    fields: [coachTransfers.oldCoachId],
    references: [coaches.id],
    relationName: "oldCoach",
  }),
  newCoach: one(coaches, {
    fields: [coachTransfers.newCoachId],
    references: [coaches.id],
    relationName: "newCoach",
  }),
}));

// Zod schemas for validation
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCoachSchema = createInsertSchema(coaches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentSchema = createInsertSchema(students)
  .omit({
    id: true,
    packageEndDate: true, // Auto-calculated
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    packageStartDate: z.string(), // Will be date string from frontend
    initialPayment: z.string().optional(), // Initial payment amount for new students
  });

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true,
});

export const insertCoachTransferSchema = createInsertSchema(coachTransfers).omit({
  id: true,
  createdAt: true,
}).extend({
  transferDate: z.string(), // Will be date string from frontend
});

export const insertStudentPaymentSchema = createInsertSchema(studentPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentDate: z.string(), // Will be date string from frontend
  newEndDate: z.string(), // Will be date string from frontend
  previousEndDate: z.string().optional(),
});

export const insertCoachPayrollSchema = createInsertSchema(coachPayrolls).omit({
  id: true,
  createdAt: true,
  calculatedAt: true,
});

// Student renewal request schema (legacy - kept for compatibility)
export const renewStudentPackageSchema = z.object({
  packageMonths: z.number().min(1).max(12),
  amount: z.string(),
  paymentDate: z.string().optional(), // Defaults to today
  notes: z.string().optional(),
});

// Smart Renewal Mode Types
export type SmartRenewalMode = "quick" | "price_update" | "package_switch";

// Smart Renewal Request Schema - 3 modes:
// 1. quick: Same package, same price (auto-fetches from last payment)
// 2. price_update: Same package duration, new price
// 3. package_switch: New package duration, new price
export const smartRenewalSchema = z.discriminatedUnion("mode", [
  // Mode 1: Quick Renewal - auto-fetch last payment data
  z.object({
    mode: z.literal("quick"),
    paymentDate: z.string().optional(),
    notes: z.string().optional(),
  }),
  // Mode 2: Price Update - keep same package duration, new price
  z.object({
    mode: z.literal("price_update"),
    amount: z.string().min(1, "Tutar gerekli"),
    paymentDate: z.string().optional(),
    notes: z.string().optional(),
  }),
  // Mode 3: Package Switch - new package duration and price
  z.object({
    mode: z.literal("package_switch"),
    packageMonths: z.number().min(1).max(12),
    amount: z.string().min(1, "Tutar gerekli"),
    paymentDate: z.string().optional(),
    notes: z.string().optional(),
  }),
]);

export type SmartRenewalRequest = z.infer<typeof smartRenewalSchema>;

// TypeScript types
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;

export type CoachTransfer = typeof coachTransfers.$inferSelect;
export type InsertCoachTransfer = z.infer<typeof insertCoachTransferSchema>;

export type StudentPayment = typeof studentPayments.$inferSelect;
export type InsertStudentPayment = z.infer<typeof insertStudentPaymentSchema>;

export type CoachPayroll = typeof coachPayrolls.$inferSelect;
export type InsertCoachPayroll = z.infer<typeof insertCoachPayrollSchema>;

export type RenewStudentPackage = z.infer<typeof renewStudentPackageSchema>;

// Additional types for frontend use
export type StudentWithCoach = Student & {
  coach: Coach;
};

export type CoachWithStudents = Coach & {
  students: Student[];
  iban?: string | null; // Explicitly include for exports/display
};

// Work period for a student (for gap-aware calculations)
export type WorkPeriod = {
  startDate: string;
  endDate: string;
  daysWorked: number;
};

export type PaymentBreakdownItem = {
  studentId: string;
  studentName: string;
  amount: string;
  daysWorked: number;
  periods?: WorkPeriod[]; // For detailed period breakdown
};

export type CoachPaymentSummary = {
  coachId: string;
  coachName: string;
  activeStudentCount: number;
  totalAmount: string;
  breakdown: PaymentBreakdownItem[];
};

// Payroll breakdown item (more detailed than PaymentBreakdownItem)
export type PayrollBreakdownItem = {
  studentId: string;
  studentName: string;
  amount: string;
  daysWorked: number;
  periods: WorkPeriod[];
  hasGaps: boolean; // True if there were inactive periods
};

export type CoachPayrollSummary = {
  coachId: string;
  coachName: string;
  periodMonth: string;
  studentCount: number;
  totalAmount: string;
  breakdown: PayrollBreakdownItem[];
  status: "pending" | "paid";
  payrollId?: string; // If already saved to database
};

// Student with payment history
export type StudentWithPayments = Student & {
  coach: Coach;
  studentPayments: StudentPayment[];
};

// Dashboard stats types
export type DashboardStats = {
  activeCoaches: number;
  activeStudents: number;
  expectedMonthlyPayment: string;
  estimatedCommission: string;
  pendingPayrollTotal: string; // New: unpaid coach payments
  overdueStudentCount: number; // New: students with expired packages
};

// Package status enum
export type PackageStatus = "active" | "expiring" | "expired";
