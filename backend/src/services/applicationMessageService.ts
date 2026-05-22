import { pool } from '../db.js';
import { notFound } from '../lib/errors.js';
import { sendApplicantNoteEmail } from './notificationService.js';
import { signResubmitToken } from '../lib/jwt.js';
import { config } from '../config.js';
import type { ApplicationRow } from './applicationService.js';

export interface ApplicationMessageRow {
  id: string;
  application_id: string;
  author_user_id: string | null;
  author_name: string | null;
  kind: 'admin_note' | 'system';
  subject: string | null;
  body: string;
  email_sent: boolean;
  email_sent_at: string | null;
  email_to: string | null;
  created_at: string;
}

export async function listMessages(applicationId: string): Promise<ApplicationMessageRow[]> {
  const { rows } = await pool.query<ApplicationMessageRow>(
    `SELECT * FROM nclms_application_messages WHERE application_id = $1 ORDER BY created_at ASC`,
    [applicationId],
  );
  return rows;
}

export interface CreateMessageInput {
  applicationId: string;
  authorUserId: string;
  authorName: string;
  subject?: string;
  body: string;
  sendEmail?: boolean;
  isInfoRequest?: boolean;
  kind?: 'admin_note' | 'system';
}

export async function createMessage(
  input: CreateMessageInput,
): Promise<ApplicationMessageRow> {
  const { rows: appRows } = await pool.query<ApplicationRow>(
    `SELECT * FROM nclms_microlender_applications WHERE id = $1`,
    [input.applicationId],
  );
  const app = appRows[0];
  if (!app) throw notFound('Application not found');

  let emailResult: { sent: boolean; to: string } = { sent: false, to: '' };
  if (input.sendEmail) {
    const resubmitUrl = input.isInfoRequest
      ? `${config.appBaseUrl.replace(/\/$/, '')}/apply/edit/${signResubmitToken(app.id)}`
      : undefined;
    emailResult = await sendApplicantNoteEmail(app, {
      subject: input.subject,
      body: input.body,
      isInfoRequest: input.isInfoRequest,
      resubmitUrl,
    });
  }

  const { rows } = await pool.query<ApplicationMessageRow>(
    `INSERT INTO nclms_application_messages
       (application_id, author_user_id, author_name, kind, subject, body, email_sent, email_sent_at, email_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.applicationId,
      input.authorUserId,
      input.authorName,
      input.kind ?? 'admin_note',
      input.subject ?? null,
      input.body,
      emailResult.sent,
      emailResult.sent ? new Date().toISOString() : null,
      emailResult.sent ? emailResult.to : null,
    ],
  );
  return rows[0]!;
}
