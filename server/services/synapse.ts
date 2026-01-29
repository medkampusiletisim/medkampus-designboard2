
import { log } from "../vite";

// Configuration
// In production, these should be environment variables.
const APP_URL = process.env.APP_URL || "http://localhost:5000";
const SYNC_SECRET = process.env.SYNC_SECRET || "medkampus-synapse-protocol-secret-v1";
// Note: DevOps-Pal runs on port 5000 usually, but check port configs.
const WEBHOOK_URL = `${APP_URL}/api/integrations/webhook`;

// Retry Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sendWebhook(eventType: string, payload: any) {
    const body = JSON.stringify({
        type: eventType,
        payload,
    });

    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        try {
            console.log(`[Synapse Sender] Sending ${eventType} to ${WEBHOOK_URL} (Attempt ${attempts + 1})`);

            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "x-sync-secret": SYNC_SECRET,
                    "Content-Type": "application/json",
                },
                body,
                signal: controller.signal
            });
            clearTimeout(id);

            if (response.ok) {
                const data = await response.json();
                console.log(`[Synapse Sender] Success: ${(data as any).message || 'OK'}`);
                return true;
            } else {
                console.error(`[Synapse Sender] Failed Status ${response.status}: ${response.statusText}`);
            }
        } catch (error: any) {
            attempts++;
            console.error(`[Synapse Sender] Error (Attempt ${attempts}): ${error.message}`);
            if (attempts < MAX_RETRIES) {
                await new Promise(res => setTimeout(res, RETRY_DELAY_MS * attempts));
            }
        }
    }
    return false;
}

export const synapse = {
    // 1. New Student (Manual Create in Ops) -> App User (Invited)
    notifyStudentCreated: async (student: { firstName: string; lastName: string; email: string; phone: string; packageEndDate?: string }) => {
        return sendWebhook("STUDENT_CREATED_MANUALLY", {
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone,
            activeUntil: student.packageEndDate // YYYY-MM-DD
        });
    },

    // 2. Coach Change (Transfer in Ops) -> App Coach Reassignment
    notifyCoachChange: async (studentEmail: string, newCoachEmail: string) => {
        return sendWebhook("COACH_CHANGED", {
            studentEmail,
            newCoachEmail
        });
    },

    // 3. Cancellation (Archive in Ops) -> Cancellation in App?
    // DevOps-Pal doesn't explicitly have a "Archive" hook in its receiver yet?
    // Let's check DevOps-Pal `synapse_webhook.ts`...
    // It only has `STUDENT_CREATED_MANUALLY` and `COACH_CHANGED`.
    // It does NOT listen for deletions/cancellations from Ops yet.
    // So for now we only implement the ones it listens to.
};
