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
  opts: { subject?: string; body: string; isInfoRequest?: boolean },
): Promise<{ sent: boolean; to: string }> {
  const subjectLine = opts.subject?.trim()
    || (opts.isInfoRequest ? 'NCLMS — more information needed for your application' : 'NCLMS — message about your application');
  const banner = opts.isInfoRequest
    ? `<div style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:6px;font-weight:600;font-size:13px;margin-bottom:14px;">More information required to continue your review</div>`
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
      <p>Please reply to this email with anything we've asked for and we'll continue your review.</p>
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
