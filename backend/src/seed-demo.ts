import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// Idempotent demo seed: creates one marketing agent, one referred microlender,
// and a realistic spread of commissions (onboarding + monthly, paid + pending).

const DEMO_AGENT = {
  email: 'agent.demo@konizanam.com',
  password: 'Agent@NCLMS2026',
  fullName: 'Demo Marketing Agent',
  phone: '+264 81 555 0100',
  referralCode: 'KONIZA01',
};

const DEMO_MICRO = {
  email: 'demo.microlender@example.na',
  password: 'Demo@Loan2026',
  fullName: 'Demo Principal Officer',
  phone: '+264 81 555 0200',
  businessName: 'Kalahari Cash Loans CC',
  namfisaReg: 'NF-12345-DEMO',
  businessType: 'Close Corporation',
  city: 'Windhoek',
  physicalAddress: 'ERF 100, Independence Avenue, Windhoek',
  tier: 'tier2' as const,
};

const monthsAgoFirst = (n: number): Date => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
};

const monthsAgoMidish = (n: number): Date => {
  const d = monthsAgoFirst(n);
  d.setUTCDate(15);
  return d;
};

async function ensureAgent(): Promise<{ agentId: string; agentUserId: string }> {
  let agentUserId: string;
  const existingUser = await pool.query<{ id: string }>(
    'SELECT id FROM nclms_users WHERE email = $1',
    [DEMO_AGENT.email],
  );
  if (existingUser.rowCount! > 0) {
    agentUserId = existingUser.rows[0]!.id;
    console.log(`✓ agent user exists: ${DEMO_AGENT.email}`);
  } else {
    const hash = await bcrypt.hash(DEMO_AGENT.password, 12);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO nclms_users (email, password_hash, full_name, phone, role, status)
       VALUES ($1, $2, $3, $4, 'marketing_agent', 'active')
       RETURNING id`,
      [DEMO_AGENT.email, hash, DEMO_AGENT.fullName, DEMO_AGENT.phone],
    );
    agentUserId = rows[0]!.id;
    console.log(`+ created agent user: ${DEMO_AGENT.email}`);
  }

  let agentId: string;
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM nclms_marketing_agents WHERE user_id = $1',
    [agentUserId],
  );
  if (existing.rowCount! > 0) {
    agentId = existing.rows[0]!.id;
    console.log(`✓ marketing_agent record exists (referral code on file).`);
  } else {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO nclms_marketing_agents (user_id, referral_code, commission_rate, is_active, notes)
       VALUES ($1, $2, 0, TRUE, 'Demo seed agent (commissions follow standard contract).')
       RETURNING id`,
      [agentUserId, DEMO_AGENT.referralCode],
    );
    agentId = rows[0]!.id;
    console.log(`+ created marketing_agent with referral code ${DEMO_AGENT.referralCode}`);
  }
  return { agentId, agentUserId };
}

async function ensureMicrolender(agentId: string): Promise<{ microlenderId: string }> {
  let microUserId: string;
  const existingUser = await pool.query<{ id: string }>(
    'SELECT id FROM nclms_users WHERE email = $1',
    [DEMO_MICRO.email],
  );
  if (existingUser.rowCount! > 0) {
    microUserId = existingUser.rows[0]!.id;
    console.log(`✓ microlender user exists: ${DEMO_MICRO.email}`);
  } else {
    const hash = await bcrypt.hash(DEMO_MICRO.password, 12);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO nclms_users (email, password_hash, full_name, phone, role, status)
       VALUES ($1, $2, $3, $4, 'microlender', 'active')
       RETURNING id`,
      [DEMO_MICRO.email, hash, DEMO_MICRO.fullName, DEMO_MICRO.phone],
    );
    microUserId = rows[0]!.id;
    console.log(`+ created microlender user: ${DEMO_MICRO.email}`);
  }

  let microlenderId: string;
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM nclms_microlenders WHERE user_id = $1',
    [microUserId],
  );
  if (existing.rowCount! > 0) {
    microlenderId = existing.rows[0]!.id;
    console.log(`✓ microlender record exists: ${DEMO_MICRO.businessName}`);
  } else {
    const activatedAt = monthsAgoMidish(5);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO nclms_microlenders
         (user_id, business_name, namfisa_reg_no, business_type, physical_address,
          city, country, phone, tier, referred_by_agent_id, activated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Namibia', $7, $8, $9, $10)
       RETURNING id`,
      [
        microUserId,
        DEMO_MICRO.businessName,
        DEMO_MICRO.namfisaReg,
        DEMO_MICRO.businessType,
        DEMO_MICRO.physicalAddress,
        DEMO_MICRO.city,
        DEMO_MICRO.phone,
        DEMO_MICRO.tier,
        agentId,
        activatedAt,
      ],
    );
    microlenderId = rows[0]!.id;
    console.log(`+ created microlender ${DEMO_MICRO.businessName} (activated ${activatedAt.toISOString().slice(0, 10)})`);
  }
  return { microlenderId };
}

async function seedCommissions(agentId: string, microlenderId: string): Promise<void> {
  const existing = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::int AS c FROM nclms_agent_commissions WHERE agent_id = $1',
    [agentId],
  );
  if (Number(existing.rows[0]!.c) > 0) {
    console.log(`✓ agent has ${existing.rows[0]!.c} commission(s); skipping commission seed`);
    return;
  }

  // Tier 2 — Growth: monthly N$2,000, onboarding N$3,500.
  //   Onboarding commission: 15% of 3500 = 525
  //   Monthly commission:    25% of 2000 = 500

  // Onboarding (paid).
  await pool.query(
    `INSERT INTO nclms_agent_commissions
       (agent_id, microlender_id, period_month, type, tier, rate_applied, base_amount, amount,
        status, paid_at, paid_reference, notes)
     VALUES ($1, $2, $3, 'onboarding', 'tier2', 15, 3500, 525.00,
             'paid', $4, 'PAY-2026-001',
             'Onboarding (15% of onboarding fee per Sales Agreement clause 5.3).')`,
    [agentId, microlenderId, monthsAgoFirst(5), monthsAgoMidish(4)],
  );

  type MonthlyRow = { monthsAgo: number; status: 'paid' | 'pending'; paidMonthsAgo: number | null; ref: string | null };
  const monthly: MonthlyRow[] = [
    { monthsAgo: 5, status: 'paid',    paidMonthsAgo: 4, ref: 'PAY-2026-002' },
    { monthsAgo: 4, status: 'paid',    paidMonthsAgo: 3, ref: 'PAY-2026-003' },
    { monthsAgo: 3, status: 'paid',    paidMonthsAgo: 2, ref: 'PAY-2026-004' },
    { monthsAgo: 2, status: 'pending', paidMonthsAgo: null, ref: null },
    { monthsAgo: 1, status: 'pending', paidMonthsAgo: null, ref: null },
    { monthsAgo: 0, status: 'pending', paidMonthsAgo: null, ref: null },
  ];

  for (const r of monthly) {
    await pool.query(
      `INSERT INTO nclms_agent_commissions
         (agent_id, microlender_id, period_month, type, tier, rate_applied, base_amount, amount,
          status, paid_at, paid_reference, notes)
       VALUES ($1, $2, $3, 'monthly', 'tier2', 25, 2000, 500.00,
               $4, $5, $6,
               'Monthly subscription commission (25% per Sales Agreement clause 1.1.6).')`,
      [
        agentId,
        microlenderId,
        monthsAgoFirst(r.monthsAgo),
        r.status,
        r.paidMonthsAgo === null ? null : monthsAgoMidish(r.paidMonthsAgo),
        r.ref,
      ],
    );
  }
  console.log(`+ inserted 1 onboarding + ${monthly.length} monthly commissions`);
}

async function run(): Promise<void> {
  console.log('--- NCLMS demo seed ---');
  const { agentId } = await ensureAgent();
  const { microlenderId } = await ensureMicrolender(agentId);
  await seedCommissions(agentId, microlenderId);

  console.log('\n=========================================');
  console.log('Demo credentials (local dev only):');
  console.log('-----------------------------------------');
  console.log(`Marketing agent : ${DEMO_AGENT.email}`);
  console.log(`Password        : ${DEMO_AGENT.password}`);
  console.log(`Referral code   : ${DEMO_AGENT.referralCode}`);
  console.log('-----------------------------------------');
  console.log(`Microlender     : ${DEMO_MICRO.email}`);
  console.log(`Password        : ${DEMO_MICRO.password}`);
  console.log(`Business        : ${DEMO_MICRO.businessName}`);
  console.log('=========================================\n');
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
