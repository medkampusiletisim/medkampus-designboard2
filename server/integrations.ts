
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

const studentDeletedSchema = z.object({
    type: z.literal("STUDENT_DELETED"),
    payload: z.object({
        email: z.string().email(),
    })
});

const studentUpdatedSyncSchema = z.object({
    type: z.literal("STUDENT_UPDATED_SYNC"),
    payload: z.object({
        oldEmail: z.string().email().optional(),
        newEmail: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string(),
    })
});

const subscriptionDatesSyncSchema = z.object({
    type: z.literal("SUBSCRIPTION_DATES_SYNC"),
    payload: z.object({
        email: z.string().email(),
        startDate: z.string(),
        endDate: z.string(),
    })
});

// Union Schema
const webhookSchema = z.discriminatedUnion("type", [
    saleEventSchema,
    coachChangeEventSchema,
    cancellationEventSchema,
    studentDeletedSchema,
    studentUpdatedSyncSchema,
    subscriptionDatesSyncSchema
]);

// Helper to sanitize phone
function sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, ""); // Remove non-digits
}

// Helper to find student
async function findStudent(email: string, phone: string, oldEmail?: string, name?: { first: string, last: string }) {
    const students = await storage.getAllStudentsIncludingArchived();

    // Aggressive normalization: lowercase + remove ALL whitespace
    const cleanEmail = email.toLowerCase().replace(/\s+/g, "");
    const cleanOldEmail = oldEmail?.toLowerCase().replace(/\s+/g, "");

    // Log the search attempt for debugging
    console.log(`[Synapse Debug] Searching -> New:'${cleanEmail}', Old:'${cleanOldEmail || "N/A"}', Phone:'${phone}'` + (name ? `, Name:'${name.first} ${name.last}'` : ""));

    // 1. Try Primary Email
    let match = students.find(s => s.email?.toLowerCase().replace(/\s+/g, "") === cleanEmail);
    if (match) {
        console.log(`[Synapse Debug] Found by primary email: ${match.id} (${match.email})`);
        return match;
    }

    // 2. Try Old Email (if provided)
    if (cleanOldEmail) {
        match = students.find(s => s.email?.toLowerCase().replace(/\s+/g, "") === cleanOldEmail);
        if (match) {
            console.log(`[Synapse Debug] Found by old email: ${match.id} (${match.email})`);
            return match;
        }
    }

    // 3. Try Phone (Match last 6 digits for loose matching)
    // Only use phone fallback if email lookup failed completely
    const cleanIncoming = sanitizePhone(phone);
    if (cleanIncoming.length >= 6) {
        const incomingLast6 = cleanIncoming.slice(-6);
        match = students.find(s => {
            const cleanDb = sanitizePhone(s.phone || "");
            return cleanDb.length >= 6 && cleanDb.endsWith(incomingLast6);
        });
        if (match) {
            console.log(`[Synapse Debug] Found by phone similarity: ${match.id} (DB: ${match.phone}, In: ${phone})`);
            return match;
        }
    }

    // 4. Try Full Name (Token-based Subset Match for Robustness)
    if (name) {
        // Turkish char normalization map
        const toEnglish = (str: string) => {
            const map: { [key: string]: string } = {
                'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
            };
            return str.replace(/[çğıöşüÇĞİÖŞÜ]/g, (match) => map[match] || match).toLowerCase();
        };

        const tokenize = (str: string) => {
            return toEnglish(str).split(/[^a-z0-9]+/).filter(t => t.length > 1); // Split by non-alphanumeric, filter single chars
        };

        const incomingTokens = tokenize(name.first + " " + name.last);

        // Only attempt if we have meaningful tokens (e.g. at least 2 parts like First Last)
        if (incomingTokens.length >= 2) {
            match = students.find(s => {
                const dbTokens = tokenize((s.firstName || "") + " " + (s.lastName || ""));
                if (dbTokens.length < 2) return false;

                // Check Subset: Are ALL incoming tokens present in DB tokens?
                const incomingInDb = incomingTokens.every(t => dbTokens.includes(t));
                // OR Are ALL DB tokens present in Incoming tokens? (Handles DB="Ahmet Yilmaz", In="Ahmet Can Yilmaz")
                const dbInIncoming = dbTokens.every(t => incomingTokens.includes(t));

                return incomingInDb || dbInIncoming;
            });

            if (match) {
                console.log(`[Synapse Debug] Found by NAME TOKEN match: ${match.id} (${match.firstName} ${match.lastName})`);
                return match;
            }
        }
    }

    console.log(`[Synapse Debug] Student not found.`);
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

            // Normalize Phone (Best effort to +90)
            let normalizedPhone = sData.phone.replace(/\D/g, "");
            if (normalizedPhone.startsWith("0")) normalizedPhone = normalizedPhone.substring(1);
            if (normalizedPhone.startsWith("90")) normalizedPhone = normalizedPhone.substring(2);
            if (normalizedPhone.length === 10) normalizedPhone = "+90" + normalizedPhone;
            // If it failed to look like a TR number, just keep original clean digits or original if needed.
            // But let's use what we have.
            sData.phone = normalizedPhone.length >= 10 ? normalizedPhone : sData.phone;

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
            let student = await findStudent(sData.email, sData.phone, undefined, { first: sData.firstName, last: sData.lastName });
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
                    packageEndDate: pkgEndDate, // Sync end date
                    coachId: coach!.id,
                    status: "active",
                } as any);
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
                    packageEndDate: pkgEndDate,
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
                console.log(`[Synapse] Cancelling/Deleting student ${student.firstName}`);
                // Use explicit delete if available
                if ((storage as any).deleteStudent) {
                    await (storage as any).deleteStudent(student.id);
                } else {
                    await storage.archiveStudent(student.id, cancelDate);
                }
            }
        }
        else if (event.type === "STUDENT_DELETED") {
            const { email } = event.payload;
            const student = await findStudent(email, "000"); // Try by email only basically

            if (student) {
                console.log(`[Synapse] Deleting student ${student.firstName} (Triggered by App)`);
                // If explicit delete method exists use it, otherwise archive
                if ((storage as any).deleteStudent) {
                    await (storage as any).deleteStudent(student.id);
                } else {
                    await storage.archiveStudent(student.id, new Date().toISOString());
                }
            }
        }
        else if (event.type === "STUDENT_UPDATED_SYNC") {
            const { oldEmail, newEmail, phone, firstName, lastName } = event.payload;

            // Try to find using oldEmail or newEmail or phone
            const student = await findStudent(newEmail, phone, oldEmail, { first: firstName, last: lastName });

            if (student) {
                console.log(`[Synapse] Syncing Student Data: ${student.email} -> ${newEmail}`);
                await storage.updateStudent(student.id, {
                    email: newEmail,
                    phone: phone,
                    firstName: firstName,
                    lastName: lastName
                });
            } else {
                console.warn(`[Synapse] Student not found for Update Sync: ${newEmail}`);
            }
        }
        else if (event.type === "SUBSCRIPTION_DATES_SYNC") {
            const { email, startDate, endDate } = event.payload;
            const student = await findStudent(email, "000");

            if (student) {
                console.log(`[Synapse] Syncing Dates for ${student.firstName}: ${startDate} - ${endDate}`);
                // Use dedicated method to avoid auto-recalculation
                await storage.updateStudentDates(student.id, startDate, endDate);
            }
        }

        return res.json({ success: true, message: "Synapse Protocol: Event Processed" });
    } catch (error: any) {
        console.error("[Synapse] Error:", error);
        return res.status(500).json({ message: "Internal Error", error: error.message });
    }
});

export default router;
