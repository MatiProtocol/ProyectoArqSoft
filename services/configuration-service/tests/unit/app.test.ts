import type { Db } from 'mongodb';
import request from 'supertest';

jest.mock('@move/auth-lib', () => {
  class MockUserAuthReadRepository {
    constructor(_db: any) {}
    getRolesForUser = jest.fn().mockResolvedValue([]);
  }

  class MockGetRolesUserHandler {
    constructor(_repo: any) {}
    execute = jest.fn().mockResolvedValue([]);
  }

  const attachRoles = jest.fn().mockImplementation((_handler: any) => {
    return (_req: any, _res: any, next: any) => next();
  });

  const requireRole = jest.fn().mockImplementation((..._allowedRoles: string[]) => {
    return (_req: any, _res: any, next: any) => next();
  });

  const UserRoleDTO = {
    ADMIN: 'admin',
    USER: 'user',
  };

  return {
    auth0Breaker: { fire: jest.fn().mockResolvedValue(undefined) },
    ensureUserIdFromToken: jest.fn((_req, _res, next) => next()),
    validateJwt: jest.fn((_req, _res, next) => next()),
    attachRoles,
    requireRole,
    UserRoleDTO,

    UserAuthReadRepository: MockUserAuthReadRepository,
    GetRolesUserHandler: MockGetRolesUserHandler,
  };
});

jest.mock('@move/logs-lib', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  getCurrentCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
}));

import { app, setupRoutes } from '../../src/app';

describe('app', () => {
  beforeAll(() => {
    setupRoutes({} as Db);
  });

  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('GET / should return ok', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('mounted configuration routes should reject unauthenticated requests', async () => {
    const res = await request(app).post('/api/v1/configuration/categories').send({});
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
