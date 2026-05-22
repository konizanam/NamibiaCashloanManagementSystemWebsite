import { Router } from 'express';
import { pool } from '../db.js';
import { verifyResubmitToken } from '../lib/jwt.js';
import { unauthorized, notFound, conflict } from '../lib/errors.js';
import { applicationUpload } from '../lib/upload.js';
import { resubmitApplicationSchema } from '../schemas/resubmit.js';
import { logAudit } from '../lib/audit.js';
import { sendApplicationSubmittedEmail } from '../services/notificationService.js';
import type { ApplicationRow, DocumentType } from '../services/applicationService.js';

export const resubmitRouter = Router();

const DOCUMENT_FIELDS: { name: string; type: DocumentType; maxCount: number }[] = [
  { name: 'founding_statement',      type: 'founding_statement',      maxCount: 1 },
  { name: 'namfisa_certificate',     type: 'namfisa_certificate',     maxCount: 1 },
  { name: 'namfisa_approval_letter', type: 'namfisa_approval_letter', maxCount: 1 },
  { name: 'principal_officer_id',    type: 'principal_officer_id',    maxCount: 1 },
  { name: 'business_registration',   type: 'business_registration',   maxCount: 10 },
];

interface TokenInfo {
  application: ApplicationRow;
}

async function loadFromToken(token: string): Promise<TokenInfo> {
  let payload;
  try {
    payload = verifyResubmitToken(token);
  } catch {
    throw unauthorized('Resubmit link is invalid or has expired.');
  }
  const { rows } = await pool.query<ApplicationRow>(
    `SELECT * FROM nclms_microlender_applications WHERE id = $1`,
    [payload.applicationId],
  );
  const application = rows[0];
  if (!application) throw notFound('Application not found.');
  if (application.status !== 'requires_info') {
    throw conflict(`This application is "${application.status}" and can't be edited from this link.`);
  }
  return { application };
}

// Public: load application data for the resubmit form (only when status = requires_info).
resubmitRouter.get('/:token', async (req, res, next) => {
  try {
    const { application } = await loadFromToken(req.params.token!);
    const { rows: docs } = await pool.query(
      `SELECT id, document_type, file_name, file_size, mime_type, uploaded_at
         FROM nclms_application_documents
        WHERE application_id = $1
        ORDER BY uploaded_at ASC`,
      [application.id],
    );
    const { rows: messages } = await pool.query(
      `SELECT id, author_name, subject, body, created_at
         FROM nclms_application_messages
        WHERE application_id = $1
        ORDER BY created_at DESC
        LIMIT 5`,
      [application.id],
    );
    res.json({ application, documents: docs, recent_messages: messages });
  } catch (err) {
    next(err);
  }
});

// Public: accept updates + new document uploads, flip status to pending.
resubmitRouter.post(
  '/:token',
  applicationUpload.fields(DOCUMENT_FIELDS.map((d) => ({ name: d.name, maxCount: d.maxCount }))),
  async (req, res, next) => {
    try {
      const { application } = await loadFromToken(req.params.token!);
      const parsed = resubmitApplicationSchema.parse(req.body);

      // Build dynamic UPDATE for whichever fields the applicant changed.
      const fields = Object.entries(parsed).filter(([, v]) => v !== undefined);
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const [k, v] of fields) {
        params.push(v);
        sets.push(`${k} = $${params.length}`);
      }
      // Always set status back to pending and bump updated_at.
      sets.push(`status = 'pending'`);
      sets.push(`updated_at = NOW()`);

      params.push(application.id);
      const { rows: updated } = await pool.query<ApplicationRow>(
        `UPDATE nclms_microlender_applications
            SET ${sets.join(', ')}
          WHERE id = $${params.length}
          RETURNING *`,
        params,
      );
      const newApp = updated[0]!;

      // Persist any newly uploaded documents (additive — existing docs stay).
      const files = req.files as Record<string, Express.Multer.File[] | undefined>;
      let docsAdded = 0;
      for (const field of DOCUMENT_FIELDS) {
        const arr = files[field.name] ?? [];
        for (const f of arr) {
          await pool.query(
            `INSERT INTO nclms_application_documents
               (application_id, document_type, file_name, content, file_size, mime_type)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newApp.id, field.type, f.originalname, f.buffer, f.size, f.mimetype],
          );
          docsAdded++;
        }
      }

      // Record a system-authored thread entry summarising the resubmission.
      await pool.query(
        `INSERT INTO nclms_application_messages
           (application_id, author_user_id, author_name, kind, subject, body, email_sent)
         VALUES ($1, NULL, $2, 'system', 'Application resubmitted', $3, FALSE)`,
        [
          newApp.id,
          newApp.principal_officer_name,
          `Applicant resubmitted via secure link. ${fields.length} field update(s), ${docsAdded} new document(s). Status returned to pending.`,
        ],
      );

      await logAudit({
        action: 'application.resubmit',
        entityType: 'application',
        entityId: newApp.id,
        metadata: { field_updates: fields.length, docs_added: docsAdded },
        ipAddress: req.ip,
      });

      // Re-send the "received" email so they know it's back in our queue.
      void sendApplicationSubmittedEmail(newApp).catch((e) =>
        console.error('[email] resubmission email failed:', e),
      );

      res.status(200).json({
        application: newApp,
        message: 'Your application has been resubmitted and is back in our review queue.',
      });
    } catch (err) {
      next(err);
    }
  },
);

