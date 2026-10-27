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
    { name: 'Microlender', description: 'Microlender self-service' },
    { name: 'Admin Microlenders', description: 'Admin-side CRUD for tenant microlenders' },
    { name: 'Admin Demo Accounts', description: 'Self-registered demo companies, read from the Cash Loan Management System API' },
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
    '/api/auth/2fa/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Verify the 6-digit code after a 2FA-protected login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['challenge_token', 'code'],
                properties: {
                  challenge_token: { type: 'string' },
                  code: { type: 'string', pattern: '^[0-9]{6}$' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Auth token + user' }, '401': { description: 'Bad / expired code' } },
      },
    },
    '/api/auth/2fa/resend': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the 2FA code for an in-progress login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['challenge_token'], properties: { challenge_token: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Code resent' } },
      },
    },
    '/api/auth/2fa/enable': {
      post: {
        tags: ['Auth'],
        summary: 'Enable two-factor authentication for the current user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Enabled' } },
      },
    },
    '/api/auth/2fa/disable': {
      post: {
        tags: ['Auth'],
        summary: 'Disable two-factor authentication for the current user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Disabled' } },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password-reset email',
        description: 'Always returns 200 to avoid leaking whether the email exists.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { '200': { description: 'Acknowledged' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Use a reset token to set a new password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'new_password'],
                properties: { token: { type: 'string' }, new_password: { type: 'string', minLength: 8 } },
              },
            },
          },
        },
        responses: { '200': { description: 'Password updated' }, '401': { description: 'Invalid or expired token' } },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change the current user\'s password (clears must_change_password)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['current_password', 'new_password'],
                properties: {
                  current_password: { type: 'string' },
                  new_password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Password changed' }, '401': { description: 'Wrong current password' } },
      },
    },
    '/api/microlender/me': {
      get: {
        tags: ['Microlender'],
        summary: 'Current microlender profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile' }, '404': { description: 'No microlender record for this user' } },
      },
    },
    '/api/microlender/dashboard': {
      get: {
        tags: ['Microlender'],
        summary: 'Microlender dashboard (profile + recent application messages)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard payload' } },
      },
    },
    '/api/admin/commissions/{id}/mark-paid': {
      post: {
        tags: ['Admin Commissions'],
        summary: 'Mark commission as paid; status moves to awaiting_agent_confirmation (admin)',
        description:
          'Multipart form. Optional fields: `reference` (text) and `proof` (file). On success the agent receives an email asking them to confirm receipt.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  reference: { type: 'string' },
                  proof: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' } },
      },
    },
    '/api/admin/commissions/{id}/proof': {
      get: {
        tags: ['Admin Commissions'],
        summary: 'Download / view proof of payment (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'inline', in: 'query', schema: { type: 'string', enum: ['1', 'true'] } },
        ],
        responses: { '200': { description: 'File' } },
      },
    },
    '/api/agent/commissions/{id}/confirm': {
      post: {
        tags: ['Agent'],
        summary: 'Confirm receipt of a payment (agent)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Confirmed; status → paid' } },
      },
    },
    '/api/agent/commissions/{id}/dispute': {
      post: {
        tags: ['Agent'],
        summary: 'Dispute a payment marked by admin (agent)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } },
            },
          },
        },
        responses: { '200': { description: 'Disputed' } },
      },
    },
    '/api/agent/commissions/{id}/request-payment': {
      post: {
        tags: ['Agent'],
        summary: 'Request payment for a pending commission (agent)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { message: { type: 'string' } } },
            },
          },
        },
        responses: { '200': { description: 'Status → payment_requested' } },
      },
    },
    '/api/agent/commissions/{id}/proof': {
      get: {
        tags: ['Agent'],
        summary: 'Download / view proof of payment for own commission (agent)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'inline', in: 'query', schema: { type: 'string', enum: ['1', 'true'] } },
        ],
        responses: { '200': { description: 'File' } },
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
                  'business_type',
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
      patch: {
        tags: ['Applications'],
        summary: 'Edit an application in review (admin)',
        description: 'Allowed while status is pending or requires_info. Returns 409 if the new NAMFISA Reg No or business email clashes with another live record.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  namfisa_reg_no: { type: 'string' },
                  business_type: { type: 'string' },
                  physical_address: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                  business_phone: { type: 'string' },
                  business_email: { type: 'string', format: 'email' },
                  principal_officer_name: { type: 'string' },
                  principal_officer_id_number: { type: 'string' },
                  principal_officer_phone: { type: 'string' },
                  principal_officer_email: { type: 'string', format: 'email' },
                  preferred_tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'tier4'] },
                  referral_code_used: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '409': { description: 'Conflict / not editable' } },
      },
    },
    '/api/admin/demo-accounts': {
      get: {
        tags: ['Admin Demo Accounts'],
        summary: 'List demo accounts (admin)',
        description: 'Proxies GET /api/tenants on the Cash Loan Management System API using HTTP Basic auth (CMS_API_USERNAME / CMS_API_PASSWORD).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q',      in: 'query', schema: { type: 'string' }, description: 'Company name, slug or owner email' },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Demo accounts with verification state and next reset' },
          '502': { description: 'CMS API unreachable or rejected the request' },
          '503': { description: 'CMS API not configured' },
        },
      },
    },
    '/api/microlenders': {
      get: {
        tags: ['Admin Microlenders'],
        summary: 'List microlenders (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q',      in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'suspended', 'pending'] } },
          { name: 'tier',   in: 'query', schema: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'tier4'] } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Page of microlenders' } },
      },
      post: {
        tags: ['Admin Microlenders'],
        summary: 'Create a microlender directly (admin)',
        description: 'Skips the application flow. Creates the user (with must_change_password=true) and the microlender record.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['business_name', 'namfisa_reg_no', 'business_type', 'city', 'business_email', 'full_name', 'password'],
                properties: {
                  business_name: { type: 'string' },
                  namfisa_reg_no: { type: 'string' },
                  business_type: { type: 'string' },
                  physical_address: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string', default: 'Namibia' },
                  phone: { type: 'string' },
                  business_email: { type: 'string', format: 'email' },
                  full_name: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'tier4'], default: 'tier1' },
                  referred_by_agent_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '409': { description: 'Duplicate NAMFISA Reg No or email' } },
      },
    },
    '/api/microlenders/{id}': {
      get: {
        tags: ['Admin Microlenders'],
        summary: 'Microlender detail (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Microlender' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Admin Microlenders'],
        summary: 'Update microlender (admin)',
        description: 'Update business + user fields, change tier, or suspend / reactivate the account by setting user_status.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  namfisa_reg_no: { type: 'string' },
                  business_type: { type: 'string' },
                  physical_address: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                  phone: { type: 'string' },
                  tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'tier4'] },
                  user_status: { type: 'string', enum: ['active', 'suspended'] },
                  full_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  referred_by_agent_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '409': { description: 'Conflict' } },
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
    '/api/applications/resubmit/{token}': {
      get: {
        tags: ['Applications'],
        summary: 'Load an application for editing (public, requires resubmit token)',
        description:
          'Returns the current application data + existing documents so the public edit form can be prefilled. Only works while status = requires_info.',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Application + documents + recent admin messages' },
          '401': { description: 'Token invalid or expired' },
          '404': { description: 'Application not found' },
          '409': { description: 'Application is not in requires_info status' },
        },
      },
      post: {
        tags: ['Applications'],
        summary: 'Submit field updates and additional documents (public, requires resubmit token)',
        description:
          'Multipart form. Any field set in the body is updated; any uploaded file is appended to the document list. Status returns to pending on success.',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  business_name: { type: 'string' },
                  namfisa_reg_no: { type: 'string' },
                  business_type: { type: 'string' },
                  physical_address: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                  business_phone: { type: 'string' },
                  business_email: { type: 'string', format: 'email' },
                  principal_officer_name: { type: 'string' },
                  principal_officer_id_number: { type: 'string' },
                  principal_officer_phone: { type: 'string' },
                  principal_officer_email: { type: 'string', format: 'email' },
                  preferred_tier: { type: 'string', enum: ['tier1', 'tier2', 'tier3', 'tier4'] },
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
          '200': { description: 'Resubmitted; status returned to pending' },
          '401': { description: 'Token invalid or expired' },
          '409': { description: 'Application is not in requires_info status' },
        },
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
