import {
  attachRoles,
  ensureUserIdFromToken,
  type GetRolesUserHandler,
  requireRole,
  UserRoleDTO,
  validateJwt,
} from '@move/auth-lib';
import { Router } from 'express';
import type { DeviceAuthConfig } from '../../infrastructure/config/device-auth';
import type { GpsController } from '../controllers/gps.controller';
import type { TransferController } from '../controllers/transfer.controller';
import { deviceAuth } from '../middlewares/device-auth.middleware';
import { withErrorFactory } from '../middlewares/with-error-factory';

export type TrackingRoutesDependencies = {
  getRolesHandler: GetRolesUserHandler;
  gpsController: GpsController;
  transferController: TransferController;
  deviceAuthConfig: DeviceAuthConfig;
};

function requireRoleSafe(...allowedRoles: UserRoleDTO[]) {
  return withErrorFactory(requireRole(...allowedRoles));
}

export function createTrackingRoutes({
  getRolesHandler,
  gpsController,
  transferController,
  deviceAuthConfig,
}: TrackingRoutesDependencies) {
  const trackingRoutes = Router();
  trackingRoutes.post(
    '/gps/reading',
    deviceAuth(deviceAuthConfig),
    gpsController.ingest.bind(gpsController)
  );

  trackingRoutes.use(validateJwt);
  trackingRoutes.use(withErrorFactory(ensureUserIdFromToken));
  trackingRoutes.use(withErrorFactory(attachRoles(getRolesHandler)));

  trackingRoutes.post(
    '/transfers',
    requireRoleSafe(UserRoleDTO.OPERATOR),
    transferController.assign.bind(transferController)
  );

  trackingRoutes.post(
    '/transfers/:id/start',
    requireRoleSafe(UserRoleDTO.DRIVER),
    transferController.start.bind(transferController)
  );
  trackingRoutes.post(
    '/transfers/:id/finish',
    requireRoleSafe(UserRoleDTO.DRIVER),
    transferController.finish.bind(transferController)
  );

  trackingRoutes.get(
    '/active-transfers',
    requireRoleSafe(UserRoleDTO.OPERATOR),
    transferController.listActive.bind(transferController)
  );

  trackingRoutes.get(
    '/transfers/:id/positions',
    requireRoleSafe(UserRoleDTO.OPERATOR, UserRoleDTO.DRIVER),
    transferController.getPositions.bind(transferController)
  );

  return trackingRoutes;
}
