import { config } from '../config.js';
import { sendMail, wrapHtml, escapeHtml, paragraphsToHtml } from '../lib/email.js';
import { pool } from '../db.js';
import type { ApplicationRow } from './applicationService.js';

const PUBLIC_URL = config.appBaseUrl;

interface ApplicantContact { businessEmail: string; principalOfficerEmail: string; }

function applicantRecipients(app: ApplicationRow): string {
  const seen = new Set<string>();
  for (const e of [app.business_email, app.principal_officer_email]) {
    if (e) seen.add(e.toLowerCase());
  }
  return Array.from(seen).join(', ');
}

// ---------------------------------------------------------------------------
// Applicant: submission received
// ---------------------------------------------------------------------------
export async function sendApplicationSubmittedEmail(app: ApplicationRow): Promise<void> {
  const html = wrapHtml(
    'NCLMS application received',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Application received</h2>
      <p>Hi ${escapeHtml(app.principal_officer_name)},</p>
      <p>Thank you for submitting <strong>${escapeHtml(app.business_name)}</strong>'s application to use NCLMS. Our team will review your documents and respond by email — typically within 1–2 business days.</p>
      <table cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Application reference</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(app.id)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Business</td>
            <td style="padding:10px 14px;">${escapeHtml(app.business_name)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Status</td>
            <td style="padding:10px 14px;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-weight:600;font-size:12px;">Pending review</span></td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Submitted</td>
            <td style="padding:10px 14px;">${new Date(app.submitted_at).toUTCString()}</td></tr>
      </table>
      <p>Please keep this reference safe — it'll help us match any correspondence to your application.</p>
      <p style="color:#475569;font-size:12.5px;">If anything is missing or unclear, we'll reach out for clarification. No further action needed from you for now.</p>
    `,
  );
  await sendMail({
    to: applicantRecipients(app),
    subject: `Application received — ref ${app.id.slice(0, 8)}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Applicant: approved
// ---------------------------------------------------------------------------
export async function sendApplicationApprovedEmail(
  app: ApplicationRow,
  temporaryPassword: string,
  tier: string,
): Promise<void> {
  const loginUrl = `${PUBLIC_URL}/login`;
  const html = wrapHtml(
    'NCLMS application approved',
    `
      <h2 style="margin:0 0 12px;font-size:20px;color:#15803d;">Welcome to NCLMS</h2>
      <p>Hi ${escapeHtml(app.principal_officer_name)},</p>
      <p>Great news — <strong>${escapeHtml(app.business_name)}</strong>'s application has been approved on the <strong>${escapeHtml(tier.replace('tier','Tier '))}</strong> plan.</p>
      <p>You can now sign in using the credentials below. Please change the temporary password immediately after your first sign-in.</p>
      <table cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Sign-in email</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(app.business_email)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Temporary password</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#fef9c3;">${escapeHtml(temporaryPassword)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Application reference</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(app.id)}</td></tr>
      </table>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">Sign in to NCLMS →</a>
      </p>
      <p style="color:#475569;font-size:12.5px;">For security, share the temporary password through a different channel than this email if at all possible.</p>
    `,
  );
  await sendMail({
    to: applicantRecipients(app),
    subject: 'Your NCLMS application has been approved',
    html,
  });
}

// ---------------------------------------------------------------------------
// Applicant: rejected
// ---------------------------------------------------------------------------
export async function sendApplicationRejectedEmail(app: ApplicationRow, reason: string): Promise<void> {
  const html = wrapHtml(
    'NCLMS application — update',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Application update</h2>
      <p>Hi ${escapeHtml(app.principal_officer_name)},</p>
      <p>We've completed our review of <strong>${escapeHtml(app.business_name)}</strong>'s application and we're unable to approve it at this stage.</p>
      <div style="margin:14px 0;padding:14px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;font-size:13.5px;">
        <strong>Reason:</strong><br/>${paragraphsToHtml(reason)}
      </div>
      <p>If you believe this was in error, or you'd like to address the points above and re-apply, just reply to this email and our team will help.</p>
      <p style="color:#475569;font-size:12.5px;">Application reference: <code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(app.id)}</code></p>
    `,
  );
  await sendMail({
    to: applicantRecipients(app),
    subject: 'NCLMS application — update on your submission',
    html,
    replyTo: config.email.user,
  });
}

// ---------------------------------------------------------------------------
// Applicant: admin note / info-required
// ---------------------------------------------------------------------------
export async function sendApplicantNoteEmail(
  app: ApplicationRow,
  opts: { subject?: string; body: string; isInfoRequest?: boolean; resubmitUrl?: string },
): Promise<{ sent: boolean; to: string }> {
  const subjectLine = opts.subject?.trim()
    || (opts.isInfoRequest ? 'NCLMS — more information needed for your application' : 'NCLMS — message about your application');
  const banner = opts.isInfoRequest
    ? `<div style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:6px;font-weight:600;font-size:13px;margin-bottom:14px;">More information required to continue your review</div>`
    : '';
  const resubmitCta = opts.resubmitUrl
    ? `
      <p style="margin:18px 0;">
        <a href="${escapeHtml(opts.resubmitUrl)}"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Update &amp; resubmit your application →
        </a>
      </p>
      <p style="color:#475569;font-size:12.5px;">This link is valid for 3 days. It lets you edit your application details and upload any additional documents we've asked for.</p>
    `
    : '';
  const html = wrapHtml(
    subjectLine,
    `
      ${banner}
      <h2 style="margin:0 0 12px;font-size:20px;">Message about your application</h2>
      <p>Hi ${escapeHtml(app.principal_officer_name)},</p>
      <p>We have a note from our team regarding <strong>${escapeHtml(app.business_name)}</strong>'s application:</p>
      <div style="margin:14px 0;padding:14px 16px;background:#f8fafc;border-left:3px solid #16a34a;border-radius:4px;font-size:13.5px;">
        ${paragraphsToHtml(opts.body)}
      </div>
      ${resubmitCta}
      <p>If you have questions you can also reply directly to this email.</p>
      <p style="color:#475569;font-size:12.5px;">Application reference: <code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(app.id)}</code></p>
    `,
  );
  const to = applicantRecipients(app);
  const result = await sendMail({ to, subject: subjectLine, html, replyTo: config.email.user });
  return { sent: result.sent, to };
}

// ---------------------------------------------------------------------------
// Agent: someone signed up with their referral code
// ---------------------------------------------------------------------------
export async function sendAgentReferralSignupEmail(
  agentId: string,
  app: ApplicationRow,
): Promise<void> {
  const { rows } = await pool.query<{ full_name: string; email: string; referral_code: string }>(
    `SELECT u.full_name, u.email, a.referral_code
       FROM nclms_marketing_agents a
       JOIN nclms_users u ON u.id = a.user_id
      WHERE a.id = $1`,
    [agentId],
  );
  const agent = rows[0];
  if (!agent) return;

  const html = wrapHtml(
    'A new microlender signed up with your referral code',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">New referred application 🎉</h2>
      <p>Hi ${escapeHtml(agent.full_name)},</p>
      <p>A microlender just submitted an application using your referral code <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(agent.referral_code)}</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Business</td>
            <td style="padding:10px 14px;">${escapeHtml(app.business_name)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">City</td>
            <td style="padding:10px 14px;">${escapeHtml(app.city ?? '—')}, ${escapeHtml(app.country)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Submitted</td>
            <td style="padding:10px 14px;">${new Date(app.submitted_at).toUTCString()}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Status</td>
            <td style="padding:10px 14px;">Pending admin review</td></tr>
      </table>
      <p>You'll earn an onboarding commission as soon as the application is approved. Track everything from your agent dashboard.</p>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(PUBLIC_URL)}/login" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">Open my dashboard →</a>
      </p>
    `,
  );

  await sendMail({
    to: agent.email,
    subject: `New referred application — ${app.business_name}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Agent: welcome email after admin creates their account
// ---------------------------------------------------------------------------
export async function sendAgentWelcomeEmail(opts: {
  email: string;
  fullName: string;
  temporaryPassword: string;
  referralCode: string;
}): Promise<void> {
  const loginUrl = `${PUBLIC_URL}/login`;
  const html = wrapHtml(
    'Welcome to NCLMS',
    `
      <h2 style="margin:0 0 12px;font-size:20px;color:#15803d;">Welcome aboard</h2>
      <p>Hi ${escapeHtml(opts.fullName)},</p>
      <p>Your NCLMS marketing-agent account is ready. You'll use this account to refer microlenders, track commissions, and request payments.</p>

      <table cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Sign-in email</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(opts.email)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Temporary password</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#fef9c3;">${escapeHtml(opts.temporaryPassword)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Your referral code</td>
            <td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;color:#15803d;">${escapeHtml(opts.referralCode)}</td></tr>
      </table>

      <p><strong>On your first sign-in</strong>, you'll be asked to change your password.</p>

      <p style="margin:8px 0 4px;font-weight:600;color:#0f172a;">Your commission structure</p>
      <ul style="margin:0 0 14px 18px;padding:0;font-size:13.5px;color:#334155;">
        <li>15% of onboarding fees, once-off, when the client pays the onboarding fee.</li>
        <li>25% of subscription fees in Year 1 and Year 2.</li>
        <li>15% of subscription fees in Year 3.</li>
        <li>After month 36 the commission period ends.</li>
      </ul>

      <p>Share your referral code with the microlenders you onboard. They enter it on the Apply form and you'll be credited automatically.</p>

      <p style="margin:18px 0;">
        <a href="${escapeHtml(loginUrl)}"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Sign in to your dashboard →
        </a>
      </p>
      <p style="color:#475569;font-size:12.5px;">If anything looks off, just reply to this email and we'll sort it out.</p>
    `,
  );
  await sendMail({ to: opts.email, subject: 'Welcome to NCLMS — your agent account is ready', html });
}

// ---------------------------------------------------------------------------
// Payment workflow emails
// ---------------------------------------------------------------------------
export async function sendAgentPaymentMarkedEmail(opts: {
  agentEmail: string;
  agentName: string;
  microlenderName: string;
  amount: number;
  reference?: string;
  periodMonth: string;
  hasProof: boolean;
}): Promise<void> {
  const dashUrl = `${PUBLIC_URL}/agent/commissions`;
  const html = wrapHtml(
    'Payment received — please confirm',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Confirm payment received</h2>
      <p>Hi ${escapeHtml(opts.agentName)},</p>
      <p>Koniza has marked a commission as paid and is awaiting your confirmation:</p>
      <table cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Microlender</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.microlenderName)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Period</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.periodMonth)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Amount</td>
            <td style="padding:10px 14px;font-weight:700;color:#15803d;">N$ ${opts.amount.toFixed(2)}</td></tr>
        ${opts.reference ? `<tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Reference</td><td style="padding:10px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(opts.reference)}</td></tr>` : ''}
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Proof attached</td>
            <td style="padding:10px 14px;">${opts.hasProof ? 'Yes — view from your dashboard.' : 'No proof uploaded.'}</td></tr>
      </table>
      <p>Open your dashboard, review the proof of payment, then confirm you've received the funds in your account. If something looks off, you can also dispute the entry from the same screen.</p>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(dashUrl)}"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Confirm or dispute →
        </a>
      </p>
      <p style="color:#475569;font-size:12.5px;">We'll send you periodic reminders until you confirm.</p>
    `,
  );
  await sendMail({ to: opts.agentEmail, subject: `Payment received — confirm receipt (${opts.microlenderName})`, html });
}

export async function sendAdminPaymentRequestEmail(opts: {
  adminRecipients: string[];
  agentName: string;
  microlenderName: string;
  amount: number;
  periodMonth: string;
  message?: string;
}): Promise<void> {
  if (opts.adminRecipients.length === 0) return;
  const url = `${PUBLIC_URL}/admin/commissions`;
  const html = wrapHtml(
    'Commission payment request',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Payment requested by ${escapeHtml(opts.agentName)}</h2>
      <p>An agent has formally requested payment for a commission. Please action.</p>
      <table cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Agent</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.agentName)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Microlender</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.microlenderName)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Period</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.periodMonth)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Amount</td>
            <td style="padding:10px 14px;font-weight:700;color:#15803d;">N$ ${opts.amount.toFixed(2)}</td></tr>
        ${opts.message ? `<tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Note from agent</td><td style="padding:10px 14px;">${escapeHtml(opts.message)}</td></tr>` : ''}
      </table>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Open Admin Commissions →
        </a>
      </p>
      <p style="color:#475569;font-size:12.5px;">Reminders will repeat until this request is paid or cancelled.</p>
    `,
  );
  await sendMail({ to: opts.adminRecipients.join(', '), subject: `Payment requested — ${opts.microlenderName} (${opts.periodMonth})`, html });
}

export async function sendAdminAgentConfirmationEmail(opts: {
  adminRecipients: string[];
  agentName: string;
  microlenderName: string;
  amount: number;
  confirmed: boolean;
  disputeReason?: string;
}): Promise<void> {
  if (opts.adminRecipients.length === 0) return;
  const url = `${PUBLIC_URL}/admin/commissions`;
  const verb = opts.confirmed ? 'confirmed receipt of' : 'disputed';
  const headline = opts.confirmed ? 'Payment confirmed by agent' : 'Payment disputed by agent';
  const colour = opts.confirmed ? '#15803d' : '#b91c1c';
  const html = wrapHtml(
    headline,
    `
      <h2 style="margin:0 0 12px;font-size:20px;color:${colour};">${headline}</h2>
      <p><strong>${escapeHtml(opts.agentName)}</strong> ${verb} the commission payment for <strong>${escapeHtml(opts.microlenderName)}</strong> (N$ ${opts.amount.toFixed(2)}).</p>
      ${opts.disputeReason ? `<div style="margin:14px 0;padding:14px 16px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;font-size:13.5px;"><strong>Reason:</strong><br/>${paragraphsToHtml(opts.disputeReason)}</div>` : ''}
      <p style="margin:18px 0;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Open Admin Commissions →
        </a>
      </p>
    `,
  );
  await sendMail({ to: opts.adminRecipients.join(', '), subject: `${headline} — ${opts.microlenderName}`, html });
}

// ---------------------------------------------------------------------------
// Reminder emails
// ---------------------------------------------------------------------------
export async function sendAgentConfirmReminderEmail(opts: {
  agentEmail: string;
  agentName: string;
  microlenderName: string;
  amount: number;
  daysWaiting: number;
}): Promise<void> {
  const url = `${PUBLIC_URL}/agent/commissions`;
  const html = wrapHtml(
    'Reminder: please confirm your commission payment',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Reminder — payment awaiting your confirmation</h2>
      <p>Hi ${escapeHtml(opts.agentName)},</p>
      <p>It's been ${opts.daysWaiting} day${opts.daysWaiting === 1 ? '' : 's'} since Koniza marked your commission for <strong>${escapeHtml(opts.microlenderName)}</strong> (N$ ${opts.amount.toFixed(2)}) as paid. Please open the dashboard, verify receipt against the attached proof, and confirm — or dispute it if anything looks off.</p>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Open my dashboard →
        </a>
      </p>
      <p style="color:#475569;font-size:12.5px;">We'll keep nudging until this is resolved.</p>
    `,
  );
  await sendMail({ to: opts.agentEmail, subject: `Reminder — confirm commission payment (${opts.microlenderName})`, html });
}

export async function sendAdminPaymentRequestReminderEmail(opts: {
  adminRecipients: string[];
  agentName: string;
  microlenderName: string;
  amount: number;
  daysWaiting: number;
}): Promise<void> {
  if (opts.adminRecipients.length === 0) return;
  const url = `${PUBLIC_URL}/admin/commissions`;
  const html = wrapHtml(
    'Reminder: outstanding agent payment request',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Reminder — outstanding payment request</h2>
      <p>${escapeHtml(opts.agentName)} requested payment for <strong>${escapeHtml(opts.microlenderName)}</strong> (N$ ${opts.amount.toFixed(2)}) ${opts.daysWaiting} day${opts.daysWaiting === 1 ? '' : 's'} ago. The request is still pending.</p>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">
          Pay or update →
        </a>
      </p>
    `,
  );
  await sendMail({ to: opts.adminRecipients.join(', '), subject: `Reminder — agent payment request (${opts.microlenderName})`, html });
}

// ---------------------------------------------------------------------------
// Agent: commission earned (used on approval)
// ---------------------------------------------------------------------------
export async function sendAgentCommissionEmail(opts: {
  agentEmail: string;
  agentName: string;
  microlenderName: string;
  amount: number;
  type: 'onboarding' | 'monthly';
  tier: string;
}): Promise<void> {
  const niceType = opts.type === 'onboarding' ? 'Onboarding' : 'Monthly';
  const html = wrapHtml(
    'New commission earned',
    `
      <h2 style="margin:0 0 12px;font-size:20px;">Commission earned</h2>
      <p>Hi ${escapeHtml(opts.agentName)},</p>
      <p>A new <strong>${niceType.toLowerCase()}</strong> commission was created on your account:</p>
      <table cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #e2e8f0;border-radius:8px;width:100%;font-size:13px;">
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;width:160px;">Microlender</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.microlenderName)}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Type</td>
            <td style="padding:10px 14px;">${niceType}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Tier</td>
            <td style="padding:10px 14px;">${escapeHtml(opts.tier.replace('tier','Tier '))}</td></tr>
        <tr><td style="background:#f8fafc;padding:10px 14px;font-weight:600;color:#475569;">Amount</td>
            <td style="padding:10px 14px;font-weight:700;color:#15803d;">N$ ${opts.amount.toFixed(2)}</td></tr>
      </table>
      <p style="margin:18px 0;">
        <a href="${escapeHtml(PUBLIC_URL)}/agent/commissions" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;">View commissions →</a>
      </p>
    `,
  );
  await sendMail({ to: opts.agentEmail, subject: `${niceType} commission — ${opts.microlenderName}`, html });
}
