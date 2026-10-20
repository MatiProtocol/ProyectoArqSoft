import { ErrorFactory } from '@move/errors-lib';
import type { NextFunction, Request, Response } from 'express';
import type { UserRoleDTO } from '../../application/dtos/enums/user-role.dto';

export function requireRole(...allowedRoles: UserRoleDTO[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      const error = Object.assign(ErrorFactory.unauthorized('Authentication required'));
      throw error;
    }
    const hasRole = user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      const error = Object.assign(
        ErrorFactory.forbidden('Insufficient permissions to perform this action')
      );
      throw error;
    }
    next();
  };
}
