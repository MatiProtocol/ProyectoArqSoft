import 'express-async-errors';
import { createErrorHandler, envConfigFromProcess } from '@move/errors-lib';
import { metricsHandler } from '@move/logs-lib';
import express from 'express';
import { healthHandler } from './presentation/controllers/health.controller';
import { createIdentityRoutes, type IdentityDatabase } from './presentation/routes/identity.routes';

export const app = express();
let db: IdentityDatabase | null = null;

app.use(express.json());
app.get('/health', healthHandler);
app.get('/', (_req, res) => res.send('ok'));
app.get('/metrics', async (req, res) => {
  metricsHandler(req, res);
});

export function setupRoutes(dbInstance: IdentityDatabase) {
  db = dbInstance;
  app.use('/api/v1/identity', createIdentityRoutes(db));
  app.use(createErrorHandler(envConfigFromProcess()));
}
