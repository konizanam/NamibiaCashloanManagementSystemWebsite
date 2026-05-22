import { pool } from '../db.js';
import {
  sendAgentConfirmReminderEmail,
  sendAdminPaymentRequestReminderEmail,
} from './notificationService.js';

const REMINDER_INTERVAL_HOURS = 24;
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface AwaitingRow {
  id: string;
  amount: string;
  payment_marked_at: string;
  last_reminder_at: string | null;
  reminder_count: number;
  agent_email: string;
  agent_name: string;
  microlender_name: string | null;
}

interface RequestRow {
  id: string;
  amount: string;
  period_month: string;
  payment_request_at: string;
  last_reminder_at: string | null;
  reminder_count: number;
  agent_name: string;
  microlender_name: string | null;
}

async function nudgeAwaitingConfirmation(): Promise<number> {
  const { rows } = await pool.query<AwaitingRow>(
    `SELECT c.id, c.amount, c.payment_marked_at, c.last_reminder_at, c.reminder_count,
            u.email AS agent_email, u.full_name AS agent_name,
            m.business_name AS microlender_name
       FROM nclms_agent_commissions c
       JOIN nclms_marketing_agents a ON a.id = c.agent_id
       JOIN nclms_users u ON u.id = a.user_id
       LEFT JOIN nclms_microlenders m ON m.id = c.microlender_id
      WHERE c.status = 'awaiting_agent_confirmation'
        AND u.status = 'active'
        AND (c.last_reminder_at IS NULL OR c.last_reminder_at < NOW() - INTERVAL '${REMINDER_INTERVAL_HOURS} hours')`,
  );

  let sent = 0;
  for (const r of rows) {
    const ref = new Date(r.last_reminder_at ?? r.payment_marked_at);
    const daysWaiting = Math.max(1, Math.floor((Date.now() - new Date(r.payment_marked_at).getTime()) / 86400000));
    try {
      await sendAgentConfirmReminderEmail({
        agentEmail: r.agent_email,
        agentName: r.agent_name,
        microlenderName: r.microlender_name ?? '—',
        amount: Number(r.amount),
        daysWaiting,
      });
      await pool.query(
        `UPDATE nclms_agent_commissions
            SET last_reminder_at = NOW(),
                reminder_count = reminder_count + 1,
                updated_at = NOW()
          WHERE id = $1`,
        [r.id],
      );
      sent++;
    } catch (err) {
      console.error('[reminders] agent reminder failed:', err);
    }
    void ref;
  }
  return sent;
}

async function nudgePaymentRequests(): Promise<number> {
  const { rows: requests } = await pool.query<RequestRow>(
    `SELECT c.id, c.amount, c.period_month, c.payment_request_at, c.last_reminder_at, c.reminder_count,
            u.full_name AS agent_name,
            m.business_name AS microlender_name
       FROM nclms_agent_commissions c
       JOIN nclms_marketing_agents a ON a.id = c.agent_id
       JOIN nclms_users u ON u.id = a.user_id
       LEFT JOIN nclms_microlenders m ON m.id = c.microlender_id
      WHERE c.status = 'payment_requested'
        AND (c.last_reminder_at IS NULL OR c.last_reminder_at < NOW() - INTERVAL '${REMINDER_INTERVAL_HOURS} hours')`,
  );
  if (requests.length === 0) return 0;

  const { rows: admins } = await pool.query<{ email: string }>(
    `SELECT email FROM nclms_users WHERE role = 'admin' AND status = 'active'`,
  );
  const adminEmails = admins.map((a) => a.email);
  if (adminEmails.length === 0) return 0;

  let sent = 0;
  for (const r of requests) {
    const daysWaiting = Math.max(1, Math.floor((Date.now() - new Date(r.payment_request_at).getTime()) / 86400000));
    try {
      await sendAdminPaymentRequestReminderEmail({
        adminRecipients: adminEmails,
        agentName: r.agent_name,
        microlenderName: r.microlender_name ?? '—',
        amount: Number(r.amount),
        daysWaiting,
      });
      await pool.query(
        `UPDATE nclms_agent_commissions
            SET last_reminder_at = NOW(),
                reminder_count = reminder_count + 1,
                updated_at = NOW()
          WHERE id = $1`,
        [r.id],
      );
      sent++;
    } catch (err) {
      console.error('[reminders] admin payment-request reminder failed:', err);
    }
  }
  return sent;
}

export async function runRemindersOnce(): Promise<{ awaiting: number; requests: number }> {
  const [awaiting, requests] = await Promise.all([
    nudgeAwaitingConfirmation(),
    nudgePaymentRequests(),
  ]);
  if (awaiting + requests > 0) {
    console.log(`[reminders] sent ${awaiting} confirm-reminders, ${requests} payment-request reminders`);
  }
  return { awaiting, requests };
}

let started = false;
export function startReminderJob(): void {
  if (started) return;
  started = true;
  // Run once shortly after boot, then on the configured interval.
  setTimeout(() => { void runRemindersOnce(); }, 30_000);
  setInterval(() => { void runRemindersOnce(); }, SCAN_INTERVAL_MS);
  console.log(`[reminders] background job started (scan every ${SCAN_INTERVAL_MS / 1000 / 60} min)`);
}
