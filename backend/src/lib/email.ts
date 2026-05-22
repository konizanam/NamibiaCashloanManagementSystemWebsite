import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const { host, port, secure, user, password } = config.email;
  if (!host || !user || !password) {
    console.warn('[email] SMTP not fully configured — emails will be skipped.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    logger: config.email.debug,
    debug: config.email.debug,
  });
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const t = getTransporter();
  if (!t) return { sent: false, error: 'smtp_not_configured' };

  try {
    const info = await t.sendMail({
      from: config.email.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email] send failed:', message);
    return { sent: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// HTML helpers — minimal brand-aligned wrapper.
// ---------------------------------------------------------------------------

const BRAND_NAVY = '#0f172a';
const BRAND_GREEN = '#16a34a';
const PUBLIC_NAME = 'Koniza Information Technology';

export const wrapHtml = (title: string, body: string): string => `
<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;color:${BRAND_NAVY};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px;">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:linear-gradient(90deg,${BRAND_NAVY},${BRAND_GREEN});padding:22px 28px;color:#fff;">
          <div style="font-weight:800;font-size:20px;letter-spacing:-0.5px;">
            NCLM<span style="color:#facc15;">S</span>
          </div>
          <div style="font-size:11px;opacity:0.85;margin-top:2px;">Namibia Cash Loan Management System</div>
        </td>
      </tr>
      <tr><td style="padding:28px;font-size:14.5px;line-height:1.55;color:${BRAND_NAVY};">${body}</td></tr>
      <tr>
        <td style="padding:18px 28px;background:#f9fafb;color:#64748b;font-size:11.5px;border-top:1px solid #e2e8f0;">
          NCLMS is delivered by ${PUBLIC_NAME}. NAMFISA-aligned reporting only — system does not replace accounting, tax, or legal services.
          <div style="margin-top:6px;">
            <a href="https://it.konizanam.com/" style="color:${BRAND_GREEN};text-decoration:none;font-weight:600;">it.konizanam.com</a>
            &nbsp;·&nbsp; <a href="mailto:it@konizanam.com" style="color:${BRAND_GREEN};text-decoration:none;">it@konizanam.com</a>
          </div>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>`;

const ESC: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]!);
}

export function paragraphsToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;">${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
