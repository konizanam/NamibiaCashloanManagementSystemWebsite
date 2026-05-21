import { pool } from '../db.js';
import type { Role } from './jwt.js';

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export const logAudit = async (entry: AuditEntry): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO nclms_audit_log
         (actor_id, actor_role, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.actorId ?? null,
        entry.actorRole ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ipAddress ?? null,
      ],
    );
  } catch (err) {
    console.error('audit log failed:', err);
  }
};
