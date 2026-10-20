process.env.AUTH0_DOMAIN = 'test.domain.com';
process.env.AUTH0_AUDIENCE = 'https://test-api';

import * as authLib from '../../src/index';
import { UserReadRepository as OriginalUserReadRepository } from '../../src/infrastructure/repositories/user.read.repository';

describe('@move/auth-lib public API', () => {
  it('exports attachRoles middleware', () => {
    expect(authLib.attachRoles).toBeDefined();
    expect(typeof authLib.attachRoles).toBe('function');
  });

  it('exports requireRole middleware', () => {
    expect(authLib.requireRole).toBeDefined();
    expect(typeof authLib.requireRole).toBe('function');
  });

  it('exports validateJwt and ensureUserIdFromToken', () => {
    expect(authLib.validateJwt).toBeDefined();
    expect(typeof authLib.validateJwt).toBe('function');
    expect(authLib.ensureUserIdFromToken).toBeDefined();
    expect(typeof authLib.ensureUserIdFromToken).toBe('function');
  });

  it('exports GetRolesUserQuery (class constructor)', () => {
    expect(authLib.GetRolesUserQuery).toBeDefined();
    expect(typeof authLib.GetRolesUserQuery).toBe('function');
  });

  it('exports GetRolesUserHandler (class constructor)', () => {
    expect(authLib.GetRolesUserHandler).toBeDefined();
    expect(typeof authLib.GetRolesUserHandler).toBe('function');
  });

  it('exports UserRoleDTO (enum)', () => {
    expect(authLib.UserRoleDTO).toBeDefined();
    expect(typeof authLib.UserRoleDTO).toBe('object');
  });

  it('exports redisClient', () => {
    expect(authLib.redisClient).toBeDefined();
    expect(typeof authLib.redisClient).toBe('object');
  });

  it('should re-export UserReadRepository as UserAuthReadRepository', () => {
    expect(authLib.UserAuthReadRepository).toBe(OriginalUserReadRepository);
  });

  it('exports validateTokenWithAuth0', () => {
    expect(authLib.validateTokenWithAuth0).toBeDefined();
    expect(typeof authLib.validateTokenWithAuth0).toBe('function');
  });

  it('exports validateTokenWithAuth0Circuit', () => {
    expect(authLib.validateTokenWithAuth0Circuit).toBeDefined();
    expect(typeof authLib.validateTokenWithAuth0Circuit).toBe('function');
  });

  it('exports auth0Breaker', () => {
    expect(authLib.auth0Breaker).toBeDefined();
    expect(typeof authLib.auth0Breaker).toBe('object');
    expect(authLib.auth0Breaker).toHaveProperty('fire');
    expect(authLib.auth0Breaker).toHaveProperty('opened');
  });

  it('exports isAuth0CircuitOpen', () => {
    expect(authLib.isAuth0CircuitOpen).toBeDefined();
    expect(typeof authLib.isAuth0CircuitOpen).toBe('function');
  });

  it('exports resetAuth0Circuit', () => {
    expect(authLib.resetAuth0Circuit).toBeDefined();
    expect(typeof authLib.resetAuth0Circuit).toBe('function');
  });
});
