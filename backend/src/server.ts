import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from './config.js';
import { pool } from './db.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { applicationsRouter } from './routes/applications.js';
import { marketingAgentsRouter } from './routes/marketingAgents.js';
import { referralsRouter } from './routes/referrals.js';
import { agentRouter } from './routes/agent.js';
import { commissionsRouter } from './routes/commissions.js';
import { resubmitRouter } from './routes/resubmit.js';
import { microlenderRouter } from './routes/microlender.js';
import { microlendersRouter } from './routes/microlenders.js';
import { demoAccountsRouter } from './routes/demoAccounts.js';
import { startReminderJob } from './services/reminderService.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { openapiSpec } from './openapi/spec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = resolve(__dirname, '..', 'uploads');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: config.env === 'development' ? true : config.appBaseUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads (admin-side downloads use /api/applications/:id/documents/:docId)
app.use('/uploads', express.static(uploadsDir));

// OpenAPI JSON + Scalar UI
app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
app.use(
  '/docs',
  apiReference({
    spec: { url: '/openapi.json', title: 'NCLMS API' },
    theme: 'default',
    pageTitle: 'NCLMS API Reference',
  }),
);

// REST API
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/marketing-agents', marketingAgentsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/agent', agentRouter);
app.use('/api/admin/commissions', commissionsRouter);
app.use('/api/applications/resubmit', resubmitRouter);
app.use('/api/microlender', microlenderRouter);
app.use('/api/microlenders', microlendersRouter);
app.use('/api/admin/demo-accounts', demoAccountsRouter);

// ---------------------------------------------------------------------------
// Serve the built React frontend (Vite's `frontend/dist` output) so the
// API service can host the SPA as well. The frontend's API client uses
// relative paths, so once they're on the same origin everything just works.
// ---------------------------------------------------------------------------
const frontendDir = resolve(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(frontendDir)) {
  app.use(express.static(frontendDir));

  // SPA fallback — any GET that didn't match an API/docs/uploads route serves
  // index.html so React Router can take it from there.
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/docs') ||
      req.path === '/openapi.json' ||
      req.path.startsWith('/uploads/')
    ) {
      return next();
    }
    res.sendFile(resolve(frontendDir, 'index.html'));
  });
} else {
  console.warn(`[startup] frontend/dist not found at ${frontendDir} — serving API only.`);
}

app.use(notFoundHandler);
app.use(errorHandler);

const HOST = '0.0.0.0';
const server = app.listen(config.port, HOST, () => {
  console.log(`NCLMS API listening on ${HOST}:${config.port} (${config.env})`);
  console.log(`Scalar docs:  http://${HOST}:${config.port}/docs`);
  startReminderJob();
});

const shutdown = (signal: string): void => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
