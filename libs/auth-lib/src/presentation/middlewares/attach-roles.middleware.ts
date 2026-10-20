import type { NextFunction, Request, Response } from 'express';
import type { GetRolesUserHandler } from '../../application/queries/get-roles-user-handler';
import { GetRolesUserQuery } from '../../application/queries/get-roles-user-query';
import { redisClient } from '../../infrastructure/redis/client';

export function attachRoles(handler: GetRolesUserHandler) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const auth0Id = req.user?.id;

      const cacheKey = `roles:${auth0Id}`;
      let rolesJson = await redisClient.get(cacheKey);

      if (!rolesJson) {
        const query = new GetRolesUserQuery(auth0Id!);
        const userData = await handler.execute(query);
        rolesJson = JSON.stringify(userData.roles);
        await redisClient.setEx(cacheKey, 900, rolesJson);
      }

      req.user = { id: auth0Id as string, roles: JSON.parse(rolesJson) };
      next();
    } catch (err) {
      next(err);
    }
  };
}
