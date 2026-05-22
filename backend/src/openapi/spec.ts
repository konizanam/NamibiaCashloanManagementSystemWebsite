import { config } from '../config.js';

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'NCLMS REST API',
    version: '0.1.0',
    description:
      'Namibia Cash Loan Management System — public application submission and admin review API. Built by Koniza for Namibian microlenders. NAMFISA-aligned reporting only; the system does not replace accounting, tax, or legal services.',
    contact: {
      name: 'Koniza',
      email: 'it@konizanam.com',
      url: 'https://www.konizanam.com',
    },
  },
  servers: [
    { url: `http://localhost:${config.port}`, description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Service liveness' },
    { name: 'Auth', description: 'Admin authentication' },
    { name: 'Applications', description: 'Microlender signup applications' },
    { name: 'Marketing Agents', description: 'Koniza referrers and their referral codes' },
    { name: 'Referrals', description: 'Public referral-code validation' },
    { name: 'Agent', description: 'Marketing agent self-service (commissions, referrals, dashboard)' },
    { name: 'Admin Commissions', description: 'Admin-side commission management (list, generate monthly, mark paid)' },
    { name: 'Application Messages', description: 'Admin notes/messages to applicants' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: {},
        },
        required: ['error', 'message'],
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string' },
              full_name: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'marketing_agent', 'microlender'] },
            },
          },
        },
      },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          business_name: { type: 'string' },
          namfisa_reg_no: { type: 'string' },
          preferred_tier: { type: 'string', enum: ['tier1','tier2','tier3','tier4'], nullable: true },
          business_type: { type: 'string', nullable: true },
          physical_address: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          country: { type: 'string' },
          business_phone: { type: 'string', nullable: true },
          business_email: { type: 'string', format: 'email' },
          principal_officer_name: { type: 'string' },
          principal_officer_id_number: { type: 'string' },
          principal_officer_phone: { type: 'string' },
          principal_officer_email: { type: 'string', format: 'email' },
          referral_code_used: { type: 'string', nullable: true },
          referred_by_agent_id: { type: 'string', format: 'uuid', nullable: true },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'requires_info'] },
          submitted_at: { type: 'string', format: 'date-time' },
          reviewed_at: { type: 'string', format: 'date-time', nullable: true },
          rejection_reason: { type: 'string', nullable: true },
          review_notes: { type: 'string', nullable: true },
          approved_user_id: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      ApplicationDocument: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          application_id: { type: 'string', format: 'uuid' },
          document_type: {
            type: 'string',
            enum: [
              'founding_statement',
              'namfisa_certificate',
              'namfisa_approval_letter',
              'principal_officer_id',
              'business_registration',
              'member_id',
              'other',
            ],
          },
          file_name: { type: 'string' },
          file_size: { type: 'integer', nullable: true },
          mime_type: { type: 'string', nullable: true },
          uploaded_at: { type: 'string', format: 'date-time' },
        },
      },
      MarketingAgent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          full_name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          referral_code: { type: 'string' },
          commission_rate: { type: 'number' },
          is_active: { type: 'boolean' },
          notes: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    env: { type: 'string' },
                    db_time: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin / marketing-agent login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'JWT issued',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/api/applications': {
      post: {
        tags: ['Applications'],
        summary: 'Submit a microlender application (public)',
        description:
          'Multipart form. Required text fields are listed below. Required file fields: `founding_statement`, `principal_officer_id`, and either `namfisa_certificate` or `namfisa_approval_letter`. Optional: `member_ids` (up to 10 files).',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: [
                  'business_name',
                  'namfisa_reg_no',
                  'city',
                  'business_phone',
                  'business_email',
                  'principal_officer_name',
                  'principal_officer_id_number',
                  'principal_officer_phone',
                  'principal_officer_email',
                  'preferred_tier',
                  'founding_statement',
                  'principal_officer_id',
                  'business_registration',
                ],
                properties: {
                  business_name: { type: 'string' },
                  namfisa_reg_no: { type: 'string' },
                  business_type: { type: 'string' },
                  physical_address: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string', default: 'Namibia' },
                  business_phone: { type: 'string' },
                  business_email: { type: 'string', format: 'email' },
                  principal_officer_name: { type: 'string' },
                  principal_officer_id_number: { type: 'string' },
                  principal_officer_phone: { type: 'string' },
                  principal_officer_email: { type: 'string', format: 'email' },
                  preferred_tier: { type: 'string', enum: ['tier1','tier2','tier3','tier4'] },
                  referral_code: { type: 'string' },
                  founding_statement: { type: 'string', format: 'binary' },
                  namfisa_certificate: { type: 'string', format: 'binary' },
                  namfisa_approval_letter: { type: 'string', format: 'binary' },
                  principal_officer_id: { type: 'string', format: 'binary' },
                  business_registration: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Application accepted, pending review' },
          '400': { description: 'Validation error' },
        },
      },
      get: {
        tags: ['Applications'],
        summary: 'List applications (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'requires_info'] },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Page of applications' } },
      },
    },
    '/api/applications/{id}': {
      get: {
        tags: ['Applications'],
        summary: 'Application detail with documents (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Application detail' }, '404': { description: 'Not found' } },
      },
    },
    '/api/applications/{id}/approve': {
      post: {
        tags: ['Applications'],
        summary: 'Approve an application (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'tier4'], default: 'tier1' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Approved, temporary password issued' } },
      },
    },
    '/api/applications/{id}/reject': {
      post: {
        tags: ['Applications'],
        summary: 'Reject an application (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: { reason: { type: 'string', minLength: 1 } },
              },
            },
          },
        },
        responses: { '200': { description: 'Rejected' } },
      },
    },
    '/api/applications/{id}/documents/{documentId}': {
      get: {
        tags: ['Applications'],
        summary: 'Download an application document (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'File stream' } },
      },
    },
    '/api/marketing-agents': {
      get: {
        tags: ['Marketing Agents'],
        summary: 'List marketing agents (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List' } },
      },
      post: {
        tags: ['Marketing Agents'],
        summary: 'Create a marketing agent with auto-generated referral code (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['full_name', 'email', 'password'],
                properties: {
                  full_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  commission_rate: { type: 'number', default: 0 },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/marketing-agents/{id}': {
      get: {
        tags: ['Marketing Agents'],
        summary: 'Get a marketing agent (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Agent' } },
      },
      patch: {
        tags: ['Marketing Agents'],
        summary: 'Update a marketing agent (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Updated' } },
      },
    },
    '/api/applications/{id}/messages': {
      get: {
        tags: ['Application Messages'],
        summary: 'List messages on an application (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List of messages' } },
      },
      post: {
        tags: ['Application Messages'],
        summary: 'Post a message to applicant; optionally email it (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['body'],
                properties: {
                  subject: { type: 'string' },
                  body: { type: 'string', minLength: 1 },
                  send_email: { type: 'boolean', default: true },
                  is_info_request: {
                    type: 'boolean',
                    default: false,
                    description: 'If true, also flips application status to requires_info.',
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Message created' } },
      },
    },
    '/api/applications/{id}/request-info': {
      post: {
        tags: ['Application Messages'],
        summary: 'Mark application as requires_info (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Status changed' } },
      },
    },
    '/api/agent/me': {
      get: {
        tags: ['Agent'],
        summary: 'Current agent profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile' } },
      },
    },
    '/api/agent/dashboard': {
      get: {
        tags: ['Agent'],
        summary: 'Agent dashboard stats',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard payload' } },
      },
    },
    '/api/agent/commissions': {
      get: {
        tags: ['Agent'],
        summary: 'List agent commissions',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending','paid','cancelled'] } },
          { name: 'type',   in: 'query', schema: { type: 'string', enum: ['onboarding','monthly','bonus','adjustment'] } },
          { name: 'period_month', in: 'query', schema: { type: 'string', example: '2026-05-01' } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Page of commissions' } },
      },
    },
    '/api/agent/microlenders': {
      get: {
        tags: ['Agent'],
        summary: 'Microlenders referred by this agent',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List' } },
      },
    },
    '/api/agent/applications': {
      get: {
        tags: ['Agent'],
        summary: 'Applications submitted under this agent\'s code',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List' } },
      },
    },
    '/api/admin/commissions': {
      get: {
        tags: ['Admin Commissions'],
        summary: 'List commissions across all agents (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'agent_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending','paid','cancelled'] } },
          { name: 'type',   in: 'query', schema: { type: 'string', enum: ['onboarding','monthly','bonus','adjustment'] } },
          { name: 'period_month', in: 'query', schema: { type: 'string', example: '2026-05-01' } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Page of commissions' } },
      },
    },
    '/api/admin/commissions/generate-monthly': {
      post: {
        tags: ['Admin Commissions'],
        summary: 'Generate monthly commissions for all active referred microlenders (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['period_month'],
                properties: { period_month: { type: 'string', example: '2026-05-01' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Generation summary' } },
      },
    },
    '/api/admin/commissions/{id}/mark-paid': {
      post: {
        tags: ['Admin Commissions'],
        summary: 'Mark a commission as paid (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Updated' } },
      },
    },
    '/api/admin/commissions/{id}/cancel': {
      post: {
        tags: ['Admin Commissions'],
        summary: 'Cancel a pending commission (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Cancelled' } },
      },
    },
    '/api/referrals/validate': {
      get: {
        tags: ['Referrals'],
        summary: 'Validate a referral code (public)',
        parameters: [{ name: 'code', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean' },
                    agentName: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
