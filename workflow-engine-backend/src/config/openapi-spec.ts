export const openapiDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Workflow Engine API',
    version: '1.0.0',
    description:
      'Multi-tenant workflow, approvals, delegations, audit, and SLA APIs. Tenant context is selected with the `X-Tenant-Id` header on tenant-scoped routes.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth' },
    { name: 'Tenants' },
    { name: 'Users' },
    { name: 'Workflows' },
    { name: 'Items' },
    { name: 'Approvals' },
    { name: 'Delegations' },
    { name: 'Audit' },
    { name: 'SLA' },
    { name: 'Health' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /auth/login or POST /auth/register. Claims include userId, globalRole (ADMIN | USER), and email (sub mirrors userId).',
      },
    },
    schemas: {
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {},
          meta: { type: 'object', additionalProperties: true },
        },
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: { type: 'object' },
            example: [{ code: 'VALIDATION_ERROR' }],
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness/readiness',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                example: { success: true, data: { status: 'ok', database: 'up' }, meta: {} },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@acme.example' },
                  password: { type: 'string', example: 'Admin123!Admin123!' },
                },
              },
              examples: {
                admin: {
                  summary: 'Admin user',
                  value: { email: 'admin@acme.example', password: 'Admin123!Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'JWT issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                examples: {
                  sample: {
                    value: {
                      success: true,
                      data: {
                        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        user: { id: 'uuid', email: 'admin@acme.example', name: 'Acme Admin' },
                      },
                      meta: {},
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Sign up — creates ACTIVE user without tenant memberships',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'globalRole'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string', maxLength: 120 },
                  globalRole: { type: 'string', enum: ['ADMIN', 'USER'] },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created with JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessEnvelope' },
              },
            },
          },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } },
          },
        },
      },
    },
    '/api/v1/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenants for current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Tenants'],
        summary: 'Create tenant (platform ADMIN only; no implicit membership)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug'],
                properties: {
                  name: { type: 'string', example: 'Acme Corp' },
                  slug: { type: 'string', example: 'acme' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/tenants/{id}/members': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenant members with CREATOR/APPROVER roles per tenant',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' }, '403': { description: 'Tenant mismatch' } },
      },
      post: {
        tags: ['Tenants'],
        summary: 'Assign existing user with CREATOR/APPROVER roles',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'roles'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@acme.example' },
                  roles: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string', enum: ['CREATOR', 'APPROVER'] },
                    example: ['CREATOR'],
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Inactive user' }, '403': { description: 'Forbidden' } },
      },
    },
    '/api/v1/tenants/{id}/members/{userId}': {
      patch: {
        tags: ['Tenants'],
        summary: 'Update tenant-scoped CREATOR/APPROVER roles',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roles'],
                properties: {
                  roles: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string', enum: ['CREATOR', 'APPROVER'] },
                  },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '403': { description: 'Tenant mismatch' }, '404': { description: 'Member not found' } },
      },
      delete: {
        tags: ['Tenants'],
        summary: 'Remove user from tenant (platform ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '204': { description: 'Removed' }, '403': { description: 'Tenant mismatch / forbidden' }, '404': { description: 'Member not found' } },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users/memberships in selected tenant (platform ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/workflows': {
      post: {
        tags: ['Workflows'],
        summary: 'Create workflow + v1 draft (platform ADMIN only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: {
                name: 'Document Review',
                description: 'Two-step review',
                definition: {
                  states: [
                    { name: 'draft', isInitial: true },
                    { name: 'done', isInitial: false },
                  ],
                  transitions: [
                    {
                      name: 'submit',
                      fromStateName: 'draft',
                      toStateName: 'done',
                      requiresApproval: true,
                      approvalMode: 'SINGLE',
                      approverUserIds: ['00000000-0000-4000-8000-000000000001'],
                    },
                  ],
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
      get: {
        tags: ['Workflows'],
        summary: 'List workflows (tenant CREATOR + platform ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string', example: 'doc' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'createdAt'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/workflows/{id}': {
      get: {
        tags: ['Workflows'],
        summary: 'Get workflow with versions (tenant CREATOR + platform ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/workflows/{id}/version': {
      post: {
        tags: ['Workflows'],
        summary: 'Create new draft version (platform ADMIN only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { definition: { type: 'object' } } },
              examples: {
                copy: { summary: 'Copy from latest', value: {} },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/workflows/{id}/publish': {
      post: {
        tags: ['Workflows'],
        summary: 'Publish a draft version (platform ADMIN only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['versionId'],
                properties: { versionId: { type: 'string', format: 'uuid' } },
              },
              example: { versionId: '00000000-0000-4000-8000-000000000099' },
            },
          },
        },
        responses: { '200': { description: 'Published' } },
      },
    },
    '/api/v1/items': {
      post: {
        tags: ['Items'],
        summary: 'Create item on published workflow version',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workflowId', 'workflowVersionId'],
                properties: {
                  workflowId: { type: 'string', format: 'uuid' },
                  workflowVersionId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', example: 'Invoice #123' },
                  data: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
      get: {
        tags: ['Items'],
        summary: 'List items',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'title', 'version'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/items/{id}': {
      get: {
        tags: ['Items'],
        summary: 'Get item',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/items/{id}/transitions': {
      post: {
        tags: ['Items'],
        summary: 'Apply transition (or start approval). Supports optimistic locking and idempotency.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string', example: 'order-123-step-1' },
          },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['transitionId', 'clientVersion'],
                properties: {
                  transitionId: { type: 'string', format: 'uuid' },
                  clientVersion: { type: 'integer', example: 1 },
                  comment: { type: 'string' },
                },
              },
              example: { transitionId: '00000000-0000-4000-8000-0000000000aa', clientVersion: 1 },
            },
          },
        },
        responses: {
          '200': { description: 'Transition result' },
          '409': { description: 'Concurrency conflict or duplicate approval' },
        },
      },
    },
    '/api/v1/approvals/pending': {
      get: {
        tags: ['Approvals'],
        summary: 'Pending approvals for current user (includes delegation coverage)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/approvals/{id}/approve': {
      post: {
        tags: ['Approvals'],
        summary: 'Approve',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { comment: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/approvals/{id}/reject': {
      post: {
        tags: ['Approvals'],
        summary: 'Reject',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { comment: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/delegations': {
      post: {
        tags: ['Delegations'],
        summary: 'Create delegation',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromUserId', 'toUserId'],
                properties: {
                  fromUserId: { type: 'string', format: 'uuid' },
                  toUserId: { type: 'string', format: 'uuid' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
      get: {
        tags: ['Delegations'],
        summary: 'List delegations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/audit-logs': {
      get: {
        tags: ['Audit'],
        summary: 'Immutable audit stream (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/sla-rules': {
      post: {
        tags: ['SLA'],
        summary: 'Create SLA rule (ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workflowVersionId', 'workflowStateId', 'name', 'durationMinutes'],
                properties: {
                  workflowVersionId: { type: 'string', format: 'uuid' },
                  workflowStateId: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Draft SLA' },
                  durationMinutes: { type: 'integer', example: 120 },
                  escalateToUserId: { type: 'string', format: 'uuid' },
                  enabled: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
      get: {
        tags: ['SLA'],
        summary: 'List SLA rules',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
} as const;
