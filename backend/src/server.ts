import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiReference } from '@scalar/express-api-reference';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from './config.js';
import { pool } from './db.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { applicationsRouter } from './routes/applications.js';
import { marketingAgentsRouter } from './routes/marketingAgents.js';
import { referralsRouter } from './routes/referrals.js';
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

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`NCLMS API listening on http://localhost:${config.port} (${config.env})`);
  console.log(`Scalar docs:  http://localhost:${config.port}/docs`);
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
