import express from 'express';
import type { Db } from 'mongodb';
import request from 'supertest';
import { CategoryModel } from '../../../../src/infrastructure/models/category.model';
import { createConfigurationRoutes } from '../../../../src/presentation/routes/configuration.routes';

const mockLean = jest.fn();
const mockSort = jest.fn();

jest.mock('@move/auth-lib', () => ({
  attachRoles: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  ensureUserIdFromToken: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  GetRolesUserHandler: jest.fn(),
  requireRole: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  UserAuthReadRepository: jest.fn(),
  UserRoleDTO: {
    ADMIN: 'admin',
    OPERATOR: 'operator',
  },
  validateJwt: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../../../src/infrastructure/models/category.model', () => ({
  CategoryModel: { find: jest.fn() },
}));

const mockFind = (CategoryModel as unknown as { find: jest.Mock }).find;

describe('configuration routes', () => {
  beforeEach(() => {
    process.env.CONFIGURATION_INTERNAL_TOKEN = 'test-internal-token';
    jest.clearAllMocks();
    mockSort.mockReturnValue({ lean: mockLean });
    mockFind.mockReturnValue({ sort: mockSort });
  });

  it('should expose the internal category catalog endpoint before JWT routes', async () => {
    mockLean.mockResolvedValueOnce([
      {
        _id: 1,
        nameEn: 'Furniture',
        nameEs: 'Muebles',
        description: 'Home items',
        rules: [
          { id: 2, type: 'ALERTS' },
          { id: 3, type: 'SURCHARGE' },
        ],
      },
    ]);
    const app = express();
    app.use('/api/v1/configuration', createConfigurationRoutes({} as Db));

    const res = await request(app)
      .get('/api/v1/configuration/categories/catalog')
      .set('X-Internal-Service-Token', 'test-internal-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        nameEn: 'Furniture',
        nameEs: 'Muebles',
        description: 'Home items',
        rules: [
          { id: 2, type: 'ALERTS' },
          { id: 3, type: 'SURCHARGE' },
        ],
      },
    ]);
  });

  it('should reject the internal category catalog endpoint without the internal token', async () => {
    const app = express();
    app.use('/api/v1/configuration', createConfigurationRoutes({} as Db));

    const res = await request(app).get('/api/v1/configuration/categories/catalog');

    expect(res.status).toBe(401);
    expect(mockFind).not.toHaveBeenCalled();
  });
});
