
import { Router } from "express";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto"; // Built-in node module
import { addMonths, format, parseISO } from "date-fns";

const router = Router();

// Shared Secret for security
const SYNC_SECRET = process.env.SYNC_SECRET || "medkampus-synapse-protocol-secret-v1";

// Payload Schemas
const saleEventSchema = z.object({
    type: z.literal("SALE_CREATED"),
    payload: z.object({
        student: z.object({
            externalId: z.any(), // UUID or Int
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            phone: z.string(),
        }),
        coach: z.object({
            externalId: z.any(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email().optional(),
        }),
        package: z.object({
            name: z.string(),
            months: z.number(),
            amount: z.number(), // Amount in TL
            startDate: z.string(), // YYYY-MM-DD
            transactionId: z.string(),
        }),
    }),
});

const coachChangeEventSchema = z.object({
    type: z.literal("COACH_CHANGED"),
    payload: z.object({
        student: z.object({
            email: z.string().email(),
            phone: z.string(),
        }),
        newCoach: z.object({
            email: z.string().email().optional(),
            name: z.string(),
        }),
        date: z.string(), // YYYY-MM-DD
    }),
});

const cancellationEventSchema = z.object({
    type: z.literal("SUBSCRIPTION_CANCELLED"),
    payload: z.object({
        student: z.object({
            email: z.string().email(),
        }),
        cancelDate: z.string(),
    })
});

// Union Schema
const webhookSchema = z.discriminatedUnion("type", [
    saleEventSchema,
    coachChangeEventSchema,
    cancellationEventSchema
]);

// Helper to sanitize phone
function sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, ""); // Remove non-digits
}

// Helper to find student
async function findStudent(email: string, phone: string) {
    const students = await storage.getAllStudentsIncludingArchived();

    // 1. Try Email
    let match = students.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (match) return match;

    // 2. Try Phone
    // 2. Try Phone (Match last 6 digits for loose matching)
    const cleanAvailable = sanitizePhone(phone);
    if (cleanAvailable.length >= 6) {
        const incomingLast6 = cleanAvailable.slice(-6);
        match = students.find(s => {
            const cleanDb = sanitizePhone(s.phone);
            return cleanDb.length >= 6 && cleanDb.endsWith(incomingLast6);
        });
        if (match) return match;
    }

    return null;
}

// Helper to find coach
async function findCoach(email: string | undefined, name: string) {
    const coaches = await storage.getAllCoachesIncludingArchived();

    // 1. Try Email
    if (email) {
        const match = coaches.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (match) return match;
    }

    // 2. Try Name (First + Last contains or exact match)
    const match = coaches.find(c => {
        const dbName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const queryName = name.toLowerCase();
        return dbName.includes(queryName) || queryName.includes(dbName);
    });

    return match;
}

router.post("/webhook", async (req, res) => {
    try {
        // 1. Verify Secret
        const authHeader = req.headers["x-sync-secret"];
        if (authHeader !== SYNC_SECRET) {
            const received = typeof authHeader === 'string' ? `${authHeader.substring(0, 3)}... (Len: ${authHeader.length})` : 'Missing/Invalid';
            const expected = `${SYNC_SECRET.substring(0, 3)}... (Len: ${SYNC_SECRET.length})`;
            console.warn(`[Synapse] Unauthorized webhook attempt. Received: ${received} vs Expected: ${expected}`);
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 2. Parse Payload
        const event = webhookSchema.parse(req.body);
        console.log(`[Synapse] Received event: ${event.type}`);

        // 3. Handle Events
        if (event.type === "SALE_CREATED") {
            const { student: sData, coach: cData, package: pData } = event.payload;

            // A. Handle Coach (Upsert)
            let coach = await findCoach(cData.email, `${cData.firstName} ${cData.lastName}`);
            if (!coach) {
                console.log(`[Synapse] Coach not found, creating: ${cData.firstName} ${cData.lastName}`);
                coach = await storage.createCoach({
                    firstName: cData.firstName,
                    lastName: cData.lastName,
                    email: cData.email || `coach_${Date.now()}@medkampus.com`,
                    phone: "0000000000",
                    iban: "",
                } as any) as any;
            }

            // B. Handle Student (Upsert)
            let student = await findStudent(sData.email, sData.phone);
            const pkgEndDate = format(addMonths(new Date(pData.startDate), pData.months), "yyyy-MM-dd");

            if (student) {
                console.log(`[Synapse] Student found: ${student.firstName} ${student.lastName}. Updating...`);
                // Update existing student
                await storage.updateStudent(student.id, {
                    firstName: sData.firstName, // Update name
                    lastName: sData.lastName,   // Update surname
                    email: sData.email,         // Correct the email!
                    phone: sData.phone,         // Sync format
                    packageStartDate: pData.startDate,
                    packageMonths: pData.months,
                    coachId: coach!.id,
                    status: "active",
                });
                student = (await storage.getStudent(student.id))!;
            } else {
                console.log(`[Synapse] Student not found, creating from scratch: ${sData.firstName}`);
                // Create new student
                const newStudent = await storage.createStudent({
                    firstName: sData.firstName,
                    lastName: sData.lastName,
                    email: sData.email,
                    phone: sData.phone,
                    coachId: coach!.id,
                    packageMonths: pData.months,
                    packageStartDate: pData.startDate,
                    // IMPORTANT: We do NOT pass initialPayment here to avoid generic note.
                    // We will insert payment manually below with correct Transaction ID.
                    status: "active",
                } as any);
                student = (await storage.getStudent(newStudent.id))!;
            }

            // C. Record Payment (Income)
            const paymentNote = `Otonom Satış - Stripe: ${pData.transactionId} - Paket: ${pData.name}`;

            // Check duplicate payment
            const paymentHistory = await storage.getStudentPaymentHistory(student.id);
            const isDuplicate = paymentHistory.some(p => p.notes?.includes(pData.transactionId));

            if (!isDuplicate) {
                console.log(`[Synapse] Recording payment: ${pData.amount} TL`);
                await storage.createStudentPayment({
                    studentId: student.id,
                    amount: pData.amount.toString(),
                    paymentDate: pData.startDate,
                    packageDurationMonths: pData.months,
                    newEndDate: pkgEndDate,
                    notes: paymentNote,
                    recordedBy: "Synapse Protocol",
                });
            } else {
                console.log(`[Synapse] Duplicate payment skipped: ${pData.transactionId}`);
            }
        }
        else if (event.type === "COACH_CHANGED") {
            const { student: sData, newCoach, date } = event.payload;
            const student = await findStudent(sData.email, sData.phone);

            if (!student) {
                console.warn("Student not found for coach change");
                return res.status(404).json({ message: "Student not found" });
            }

            let coach = await findCoach(newCoach.email, newCoach.name);
            if (!coach) {
                console.warn("New coach not found, failing coach change safely");
                return res.status(404).json({ message: "Coach not found" });
            }

            console.log(`[Synapse] Transferring ${student.firstName} to ${coach.firstName} on ${date}`);
            await storage.transferStudentCoach(student.id, coach.id, date, "Otonom Transfer (DevOps-Pal)");
        }
        else if (event.type === "SUBSCRIPTION_CANCELLED") {
            const { student: sData, cancelDate } = event.payload;
            const student = await findStudent(sData.email, "000"); // Phone irrelevant for cancellation

            if (student) {
                console.log(`[Synapse] Cancelling student ${student.firstName}`);
                await storage.archiveStudent(student.id, cancelDate);
            }
        }

        return res.json({ success: true, message: "Synapse Protocol: Event Processed" });
    } catch (error: any) {
        console.error("[Synapse] Error:", error);
        return res.status(500).json({ message: "Internal Error", error: error.message });
    }
});

export default router;
