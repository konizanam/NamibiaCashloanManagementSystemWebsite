import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import type { CreateApplicationInput } from '../schemas/application.js';
import {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendApplicationSubmittedEmail,
  sendAgentReferralSignupEmail,
  sendAgentCommissionEmail,
} from './notificationService.js';
import { createOnboardingCommission } from './commissionService.js';

export type DocumentType =
  | 'founding_statement'
  | 'namfisa_certificate'
  | 'namfisa_approval_letter'
  | 'principal_officer_id'
  | 'business_registration'
  | 'member_id'
  | 'other';

export interface UploadedDocInput {
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface ApplicationRow {
  id: string;
  business_name: string;
  namfisa_reg_no: string | null;
  preferred_tier: 'tier1' | 'tier2' | 'tier3' | 'tier4' | null;
  business_type: string | null;
  physical_address: string | null;
  city: string | null;
  country: string;
  business_phone: string | null;
  business_email: string;
  principal_officer_name: string;
  principal_officer_id_number: string;
  principal_officer_phone: string;
  principal_officer_email: string;
  referral_code_used: string | null;
  referred_by_agent_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'requires_info';
  submitted_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  review_notes: string | null;
  approved_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationDocumentRow {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: Date;
}

async function resolveReferralAgentId(code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  const { rows } = await pool.query<{ id: string; is_active: boolean }>(
    `SELECT id, is_active FROM nclms_marketing_agents WHERE referral_code = $1`,
    [code.toUpperCase()],
  );
  if (rows.length === 0) return null;
  const row = rows[0]!;
  if (!row.is_active) return null;
  return row.id;
}

export const validateReferralCode = async (code: string): Promise<{ valid: boolean; agentName?: string }> => {
  const { rows } = await pool.query<{ full_name: string; is_active: boolean }>(
    `SELECT u.full_name, a.is_active
       FROM nclms_marketing_agents a
       JOIN nclms_users u ON u.id = a.user_id
      WHERE a.referral_code = $1`,
    [code.trim().toUpperCase()],
  );
  if (rows.length === 0) return { valid: false };
  const row = rows[0]!;
  if (!row.is_active) return { valid: false };
  return { valid: true, agentName: row.full_name };
};

export const createApplication = async (
  input: CreateApplicationInput,
  documents: UploadedDocInput[],
): Promise<ApplicationRow> => {
  if (documents.length === 0) {
    throw badRequest('At least one supporting document is required.');
  }

  const referralCode = input.referral_code ? input.referral_code.toUpperCase() : null;
  const agentId = await resolveReferralAgentId(referralCode);

  const application = await withTransaction(async (client) => {
    const { rows } = await client.query<ApplicationRow>(
      `INSERT INTO nclms_microlender_applications (
         business_name, namfisa_reg_no, business_type,
         physical_address, city, country, business_phone, business_email,
         principal_officer_name, principal_officer_id_number,
         principal_officer_phone, principal_officer_email,
         preferred_tier, referral_code_used, referred_by_agent_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15
       )
       RETURNING *`,
      [
        input.business_name,
        input.namfisa_reg_no,
        input.business_type ?? null,
        input.physical_address ?? null,
        input.city,
        input.country,
        input.business_phone,
        input.business_email,
        input.principal_officer_name,
        input.principal_officer_id_number,
        input.principal_officer_phone,
        input.principal_officer_email,
        input.preferred_tier,
        referralCode,
        agentId,
      ],
    );

    const application = rows[0]!;

    for (const doc of documents) {
      await client.query(
        `INSERT INTO nclms_application_documents
           (application_id, document_type, file_name, file_path, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [application.id, doc.documentType, doc.fileName, doc.filePath, doc.fileSize, doc.mimeType],
      );
    }

    return application;
  });

  // Fire-and-forget notifications.
  void sendApplicationSubmittedEmail(application).catch((e) =>
    console.error('[email] submission email failed:', e),
  );
  if (agentId) {
    void sendAgentReferralSignupEmail(agentId, application).catch((e) =>
      console.error('[email] agent referral email failed:', e),
    );
  }

  return application;
};

export interface ListApplicationsOpts {
  status?: ApplicationRow['status'];
  limit: number;
  offset: number;
}

export const listApplications = async (opts: ListApplicationsOpts) => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  params.push(opts.limit);
  params.push(opts.offset);

  const { rows } = await pool.query<ApplicationRow & { document_count: string }>(
    `SELECT a.*,
            (SELECT COUNT(*)::int FROM nclms_application_documents d WHERE d.application_id = a.id) AS document_count
       FROM nclms_microlender_applications a
       ${whereSql}
       ORDER BY a.submitted_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::int AS total FROM nclms_microlender_applications a ${whereSql}`,
    params.slice(0, params.length - 2),
  );

  return {
    items: rows,
    total: Number(countRows[0]?.total ?? 0),
    limit: opts.limit,
    offset: opts.offset,
  };
};

export const getApplicationWithDocuments = async (id: string) => {
  const { rows } = await pool.query<ApplicationRow>(
    `SELECT * FROM nclms_microlender_applications WHERE id = $1`,
    [id],
  );
  const application = rows[0];
  if (!application) throw notFound('Application not found');

  const { rows: docs } = await pool.query<ApplicationDocumentRow>(
    `SELECT * FROM nclms_application_documents WHERE application_id = $1 ORDER BY uploaded_at ASC`,
    [id],
  );

  return { application, documents: docs };
};

export const rejectApplication = async (
  id: string,
  reviewedBy: string,
  reason: string,
): Promise<ApplicationRow> => {
  const { rows } = await pool.query<ApplicationRow>(
    `UPDATE nclms_microlender_applications
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = $2,
            rejection_reason = $3,
            updated_at = NOW()
      WHERE id = $1 AND status IN ('pending','requires_info')
      RETURNING *`,
    [id, reviewedBy, reason],
  );
  if (rows.length === 0) {
    throw conflict('Application is not pending review or does not exist.');
  }
  const updated = rows[0]!;
  void sendApplicationRejectedEmail(updated, reason).catch((e) =>
    console.error('[email] reject email failed:', e),
  );
  return updated;
};

export async function setApplicationRequiresInfo(
  id: string,
  reviewedBy: string,
  notes?: string,
): Promise<ApplicationRow> {
  const { rows } = await pool.query<ApplicationRow>(
    `UPDATE nclms_microlender_applications
        SET status = 'requires_info',
            review_notes = COALESCE($3, review_notes),
            updated_at = NOW(),
            reviewed_by = $2
      WHERE id = $1 AND status IN ('pending','requires_info')
      RETURNING *`,
    [id, reviewedBy, notes ?? null],
  );
  if (rows.length === 0) {
    throw conflict('Application is not pending review or does not exist.');
  }
  return rows[0]!;
}

export interface ApproveOpts {
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  notes?: string;
}

export const approveApplication = async (
  id: string,
  reviewedBy: string,
  opts: ApproveOpts,
): Promise<{ application: ApplicationRow; userId: string; temporaryPassword: string }> => {
  const result = await withTransaction(async (client) => {
    const { rows: appRows } = await client.query<ApplicationRow>(
      `SELECT * FROM nclms_microlender_applications WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const app = appRows[0];
    if (!app) throw notFound('Application not found');
    if (app.status !== 'pending' && app.status !== 'requires_info') {
      throw conflict(`Application is already ${app.status}.`);
    }

    const { rows: existing } = await client.query<{ id: string }>(
      `SELECT id FROM nclms_users WHERE email = $1`,
      [app.business_email],
    );
    if (existing.length > 0) {
      throw conflict('A user with this business email already exists.');
    }

    const temporaryPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const { rows: userRows } = await client.query<{ id: string }>(
      `INSERT INTO nclms_users (email, password_hash, full_name, phone, role, status)
       VALUES ($1, $2, $3, $4, 'microlender', 'active')
       RETURNING id`,
      [
        app.business_email,
        passwordHash,
        app.principal_officer_name,
        app.principal_officer_phone,
        ],
    );
    const userId = userRows[0]!.id;

    const { rows: microRows } = await client.query<{ id: string }>(
      `INSERT INTO nclms_microlenders (
         user_id, business_name, namfisa_reg_no, business_type,
         physical_address, city, country, phone, tier,
         referred_by_agent_id, application_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        userId,
        app.business_name,
        app.namfisa_reg_no,
        app.business_type,
        app.physical_address,
        app.city,
        app.country,
        app.business_phone,
        opts.tier,
        app.referred_by_agent_id,
        app.id,
      ],
    );
    const microlenderId = microRows[0]!.id;

    const { rows: updated } = await client.query<ApplicationRow>(
      `UPDATE nclms_microlender_applications
          SET status = 'approved',
              reviewed_at = NOW(),
              reviewed_by = $2,
              review_notes = $3,
              approved_user_id = $4,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [id, reviewedBy, opts.notes ?? null, userId],
    );

    // Onboarding commission (if the application carried a referring agent).
    let onboardingAmount = 0;
    let agentInfo: { id: string; email: string; full_name: string } | null = null;
    if (app.referred_by_agent_id) {
      const { rows: agentRows } = await client.query<{ id: string; rate: string; email: string; full_name: string }>(
        `SELECT a.id, a.commission_rate::text AS rate, u.email, u.full_name
           FROM nclms_marketing_agents a
           JOIN nclms_users u ON u.id = a.user_id
          WHERE a.id = $1 AND a.is_active = TRUE`,
        [app.referred_by_agent_id],
      );
      const agent = agentRows[0];
      if (agent) {
        const created = await createOnboardingCommission(client, {
          agentId: agent.id,
          microlenderId,
          applicationId: app.id,
          tier: opts.tier,
          rate: Number(agent.rate),
        });
        if (created) {
          onboardingAmount = Number(created.amount);
          agentInfo = { id: agent.id, email: agent.email, full_name: agent.full_name };
        }
      }
    }

    return { application: updated[0]!, userId, temporaryPassword, agentInfo, onboardingAmount, microlenderId };
  });

  // Fire-and-forget emails.
  void sendApplicationApprovedEmail(result.application, result.temporaryPassword, opts.tier).catch((e) =>
    console.error('[email] approval email failed:', e),
  );
  if (result.agentInfo && result.onboardingAmount > 0) {
    void sendAgentCommissionEmail({
      agentEmail: result.agentInfo.email,
      agentName: result.agentInfo.full_name,
      microlenderName: result.application.business_name,
      amount: result.onboardingAmount,
      type: 'onboarding',
      tier: opts.tier,
    }).catch((e) => console.error('[email] agent commission email failed:', e));
  }

  return {
    application: result.application,
    userId: result.userId,
    temporaryPassword: result.temporaryPassword,
  };
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export const getDocumentForDownload = async (
  documentId: string,
): Promise<ApplicationDocumentRow> => {
  const { rows } = await pool.query<ApplicationDocumentRow>(
    `SELECT * FROM nclms_application_documents WHERE id = $1`,
    [documentId],
  );
  if (rows.length === 0) throw notFound('Document not found');
  return rows[0]!;
};
