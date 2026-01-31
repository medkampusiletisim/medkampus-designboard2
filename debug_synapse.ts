
import { storage } from "./server/storage.ts";
import { z } from "zod";

// Mock the findStudent logic from integrations.ts strictly
async function findStudent(email: string, phone: string, oldEmail?: string, name?: { first: string, last: string }) {
    const students = await storage.getAllStudentsIncludingArchived();

    // Aggressive normalization rules from integrations.ts
    const cleanEmail = email.toLowerCase().replace(/\s+/g, "");
    const cleanOldEmail = oldEmail?.toLowerCase().replace(/\s+/g, "");
    const sanitizePhone = (p: string) => p.replace(/\D/g, "");

    console.log(`\n--- Searching for ---`);
    console.log(`Email (Clean): '${cleanEmail}'`);
    console.log(`Old Email (Clean): '${cleanOldEmail || "N/A"}'`);
    console.log(`Phone (Raw): '${phone}'`);
    if (name) console.log(`Name: '${name.first} ${name.last}'`);
    console.log(`---------------------\n`);

    // 1. Try Primary Email
    let match = students.find(s => s.email?.toLowerCase().replace(/\s+/g, "") === cleanEmail);
    if (match) {
        console.log(`[MATCH] Found by primary email: ${match.id} (${match.email})`);
        return match;
    }

    // 2. Try Old Email
    if (cleanOldEmail) {
        match = students.find(s => s.email?.toLowerCase().replace(/\s+/g, "") === cleanOldEmail);
        if (match) {
            console.log(`[MATCH] Found by old email: ${match.id} (${match.email})`);
            return match;
        }
    }

    // 3. Try Phone
    const cleanIncoming = sanitizePhone(phone);
    if (cleanIncoming.length >= 6) {
        const incomingLast6 = cleanIncoming.slice(-6);
        match = students.find(s => {
            const cleanDb = sanitizePhone(s.phone || "");
            return cleanDb.length >= 6 && cleanDb.endsWith(incomingLast6);
        });
        if (match) {
            console.log(`[MATCH] Found by phone similarity: ${match.id} (DB: ${match.phone})`);
            return match;
        }
    }

    // 4. Try Name (Fuzzy Turkish)
    if (name) {
        const toEnglish = (str: string) => {
            const map: { [key: string]: string } = {
                'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
            };
            return str.replace(/[çğıöşüÇĞİÖŞÜ]/g, (match) => map[match] || match).toLowerCase().replace(/\s+/g, "");
        };

        const cleanName = toEnglish(name.first + name.last);
        console.log(`Normalized Target Name: '${cleanName}'`);

        if (cleanName.length >= 5) {
            match = students.find(s => {
                const dbName = toEnglish((s.firstName || "") + (s.lastName || ""));
                return dbName === cleanName;
            });
            if (match) {
                console.log(`[MATCH] Found by NAME match: ${match.id} (${match.firstName} ${match.lastName})`);
                return match;
            }
        }
    }

    console.log(`[FAIL] No match found.`);
    return null;
}

async function runDebug() {
    // 1. List all students first to see what we have
    console.log("Fetching all students from DB...");
    const all = await storage.getAllStudentsIncludingArchived();
    console.log(`Found ${all.length} students in DB.`);
    all.forEach(s => {
        console.log(`ID: ${s.id} | Name: ${s.firstName} ${s.lastName} | Email: ${s.email} | Phone: ${s.phone}`);
    });

    // 2. Simulate the failing case
    // Edit these values to match what you THINK is failing
    const mockPayload = {
        newEmail: "dogru.email@example.com", // The correct email sent from App
        oldEmail: undefined, // Usually undefined unless App detected change
        phone: "5551234567", // App's phone
        firstName: "Test",
        lastName: "User"
    };

    console.log("\nRunning simulation with payload:", mockPayload);
    await findStudent(mockPayload.newEmail, mockPayload.phone, mockPayload.oldEmail, { first: mockPayload.firstName, last: mockPayload.lastName });
}

runDebug().catch(console.error);
