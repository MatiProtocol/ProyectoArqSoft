import type { Request } from 'express';
import { getCleanRoute } from '../../../src/logger/route.utils';

describe('getCleanRoute', () => {
  it('should use route.path when available', () => {
    const req = {
      route: {
        path: '/users/:id',
      },
    } as Request;

    expect(getCleanRoute(req)).toBe('/users/:id');
  });

  it('should use path when route.path is not available', () => {
    const req = {
      path: '/users',
    } as Request;

    expect(getCleanRoute(req)).toBe('/users');
  });

  it('should use url when route.path and path are not available', () => {
    const req = {
      url: '/users',
    } as Request;

    expect(getCleanRoute(req)).toBe('/users');
  });

  it('should replace numeric ids', () => {
    const req = {
      path: '/users/123/orders/456',
    } as Request;

    expect(getCleanRoute(req)).toBe('/users/:id/orders/:id');
  });

  it('should replace mongodb object ids', () => {
    const req = {
      path: '/users/507f1f77bcf86cd799439011',
    } as Request;

    expect(getCleanRoute(req)).toBe('/users/:id');
  });

  it('should replace mixed numeric and mongodb ids', () => {
    const req = {
      path: '/users/507f1f77bcf86cd799439011/orders/123',
    } as Request;

    expect(getCleanRoute(req)).toBe('/users/:id/orders/:id');
  });

  it('should not modify routes without ids', () => {
    const req = {
      path: '/users/profile',
    } as Request;

    expect(getCleanRoute(req)).toBe('/users/profile');
  });
});
