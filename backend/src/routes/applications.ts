import { Router } from 'express';
import { resolve } from 'node:path';
import { unlink } from 'node:fs/promises';
import { applicationUpload } from '../lib/upload.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import {
  approveApplicationSchema,
  createApplicationSchema,
  listApplicationsQuerySchema,
  rejectApplicationSchema,
} from '../schemas/application.js';
import { messageSchema } from '../schemas/agent.js';
import {
  approveApplication,
  createApplication,
  getApplicationWithDocuments,
  getDocumentForDownload,
  listApplications,
  rejectApplication,
  setApplicationRequiresInfo,
  type DocumentType,
  type UploadedDocInput,
} from '../services/applicationService.js';
import { createMessage, listMessages } from '../services/applicationMessageService.js';
import { pool } from '../db.js';
import { badRequest } from '../lib/errors.js';
import { logAudit } from '../lib/audit.js';

export const applicationsRouter = Router();

const DOCUMENT_FIELDS: { name: string; type: DocumentType; maxCount: number }[] = [
  { name: 'founding_statement', type: 'founding_statement', maxCount: 1 },
  { name: 'namfisa_certificate', type: 'namfisa_certificate', maxCount: 1 },
  { name: 'namfisa_approval_letter', type: 'namfisa_approval_letter', maxCount: 1 },
  { name: 'principal_officer_id', type: 'principal_officer_id', maxCount: 1 },
  { name: 'member_ids', type: 'member_id', maxCount: 10 },
];

// Public — submit application
applicationsRouter.post(
  '/',
  applicationUpload.fields(DOCUMENT_FIELDS.map((d) => ({ name: d.name, maxCount: d.maxCount }))),
  async (req, res, next) => {
    let savedPaths: string[] = [];
    try {
      const parsed = createApplicationSchema.parse(req.body);
      const files = req.files as Record<string, Express.Multer.File[] | undefined>;

      const documents: UploadedDocInput[] = [];
      for (const field of DOCUMENT_FIELDS) {
        const arr = files[field.name] ?? [];
        for (const f of arr) {
          documents.push({
            documentType: field.type,
            fileName: f.originalname,
            filePath: f.path,
            fileSize: f.size,
            mimeType: f.mimetype,
          });
          savedPaths.push(f.path);
        }
      }

      if (!documents.some((d) => d.documentType === 'founding_statement')) {
        throw badRequest('Founding statement is required.');
      }
      if (
        !documents.some(
          (d) => d.documentType === 'namfisa_certificate' || d.documentType === 'namfisa_approval_letter',
        )
      ) {
        throw badRequest('Either a NAMFISA certificate or NAMFISA approval letter is required.');
      }
      if (!documents.some((d) => d.documentType === 'principal_officer_id')) {
        throw badRequest('Principal officer ID is required.');
      }

      const application = await createApplication(parsed, documents);

      await logAudit({
        action: 'application.submit',
        entityType: 'application',
        entityId: application.id,
        metadata: { business_name: application.business_name, referral_code: parsed.referral_code ?? null },
        ipAddress: req.ip,
      });

      res.status(201).json({
        id: application.id,
        status: application.status,
        submitted_at: application.submitted_at,
        message: 'Application submitted. You will receive an email once it has been reviewed.',
      });
    } catch (err) {
      await Promise.all(
        savedPaths.map((p) => unlink(p).catch(() => undefined)),
      );
      next(err);
    }
  },
);

// Admin — list
applicationsRouter.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(listApplicationsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as {
        status?: 'pending' | 'approved' | 'rejected' | 'requires_info';
        limit: number;
        offset: number;
      };
      const result = await listApplications({
        status: q.status,
        limit: q.limit,
        offset: q.offset,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Admin — detail
applicationsRouter.get('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id!;
    const result = await getApplicationWithDocuments(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Admin — approve
applicationsRouter.post(
  '/:id/approve',
  requireAuth,
  requireRole('admin'),
  validate(approveApplicationSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const body = req.body as { tier: 'tier1' | 'tier2' | 'tier3' | 'tier4'; notes?: string };
      const result = await approveApplication(req.params.id!, auth.sub, body);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'application.approve',
        entityType: 'application',
        entityId: result.application.id,
        metadata: { tier: body.tier, microlender_user_id: result.userId },
        ipAddress: req.ip,
      });
      res.json({
        application: result.application,
        microlender_user_id: result.userId,
        temporary_password: result.temporaryPassword,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Admin — reject
applicationsRouter.post(
  '/:id/reject',
  requireAuth,
  requireRole('admin'),
  validate(rejectApplicationSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const { reason } = req.body as { reason: string };
      const application = await rejectApplication(req.params.id!, auth.sub, reason);
      await logAudit({
        actorId: auth.sub,
        actorRole: auth.role,
        action: 'application.reject',
        entityType: 'application',
        entityId: application.id,
        metadata: { reason },
        ipAddress: req.ip,
      });
      res.json({ application });
    } catch (err) {
      next(err);
    }
  },
);

// Admin — download a document
applicationsRouter.get(
  '/:id/documents/:documentId',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const doc = await getDocumentForDownload(req.params.documentId!);
      const absolute = resolve(doc.file_path);
      res.download(absolute, doc.file_name);
    } catch (err) {
      next(err);
    }
  },
);

// Admin — list messages on an application
applicationsRouter.get(
  '/:id/messages',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const items = await listMessages(req.params.id!);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  },
);

// Admin — post a message to applicant (optionally email it)
applicationsRouter.post(
  '/:id/messages',
  requireAuth,
  requireRole('admin'),
  validate(messageSchema),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const body = req.body as {
        subject?: string;
        body: string;
        send_email: boolean;
        is_info_request: boolean;
      };
      const { rows } = await pool.query<{ full_name: string }>(
        `SELECT full_name FROM nclms_users WHERE id = $1`,
        [auth.sub],
      );
      const authorName = rows[0]?.full_name ?? 'NCLMS Admin';

      const msg = await createMessage({
        applicationId: req.params.id!,
        authorUserId: auth.sub,
        authorName,
        subject: body.subject,
        body: body.body,
        sendEmail: body.send_email,
        isInfoRequest: body.is_info_request,
      });

      // If marked as info request, also flip the application status.
      if (body.is_info_request) {
        await setApplicationRequiresInfo(req.params.id!, auth.sub, body.body);
      }

      res.status(201).json(msg);
    } catch (err) {
      next(err);
    }
  },
);

// Admin — set status to requires_info (without sending a message)
applicationsRouter.post(
  '/:id/request-info',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const auth = (req as AuthedRequest).user!;
      const notes = (req.body as { notes?: string })?.notes;
      const updated = await setApplicationRequiresInfo(req.params.id!, auth.sub, notes);
      res.json({ application: updated });
    } catch (err) {
      next(err);
    }
  },
);
