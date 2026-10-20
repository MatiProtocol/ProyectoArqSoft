import 'express-async-errors';
import type { UserAuthReadRepository } from '@move/auth-lib';
import { createErrorHandler, envConfigFromProcess } from '@move/errors-lib';
import express from 'express';
import { createConfigurationRoutes } from './presentation/routes/configuration.routes';

export const app = express();

app.use(express.json());
app.get('/health', (_req, res) => res.sendStatus(200));
app.get('/', (_req, res) => res.send('ok'));

type UserAuthDatabase = ConstructorParameters<typeof UserAuthReadRepository>[0];

export function setupRoutes(dbInstance: UserAuthDatabase) {
  app.use('/api/v1/configuration', createConfigurationRoutes(dbInstance));
  app.use(createErrorHandler(envConfigFromProcess()));
}
