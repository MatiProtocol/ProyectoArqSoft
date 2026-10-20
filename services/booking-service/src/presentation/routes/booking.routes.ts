import {
  attachRoles,
  ensureUserIdFromToken,
  type GetRolesUserHandler,
  requireRole,
  UserRoleDTO,
  validateJwt,
} from '@move/auth-lib';
import { Router } from 'express';
import type { CompanyPreregistrationController } from '../controllers/company-preregistration.controller';
import type { CreateBookingController } from '../controllers/create-booking.controller';
import type { CreateCompanyBookingController } from '../controllers/create-company-booking.controller';
import type { ListCustomerBookingsController } from '../controllers/list-customer-bookings.controller';
import type { ManualClassifyBookingController } from '../controllers/manual-classify-booking.controller';
import type { PayBookingController } from '../controllers/pay-booking.controller';
import type { QuoteBookingController } from '../controllers/quote-booking.controller';

export type BookingRoutesDependencies = {
  getRolesHandler: GetRolesUserHandler;
  createBookingController: CreateBookingController;
  createCompanyBookingController: CreateCompanyBookingController;
  companyPreregistrationController: CompanyPreregistrationController;
  listCustomerBookingsController: ListCustomerBookingsController;
  manualClassifyBookingController: ManualClassifyBookingController;
  quoteBookingController: QuoteBookingController;
  payBookingController: PayBookingController;
};

export function createBookingRoutes({
  getRolesHandler,
  createBookingController,
  createCompanyBookingController,
  companyPreregistrationController,
  listCustomerBookingsController,
  manualClassifyBookingController,
  quoteBookingController,
  payBookingController,
}: BookingRoutesDependencies) {
  const bookingRoutes = Router();

  bookingRoutes.use(validateJwt);
  bookingRoutes.use(ensureUserIdFromToken);
  bookingRoutes.use(attachRoles(getRolesHandler));
  bookingRoutes.get(
    '/',
    requireRole(UserRoleDTO.CLIENT_COMPANY, UserRoleDTO.CLIENT_INDIVIDUAL),
    listCustomerBookingsController.list.bind(listCustomerBookingsController)
  );
  bookingRoutes.post(
    '/individual',
    requireRole(UserRoleDTO.CLIENT_INDIVIDUAL),
    createBookingController.create.bind(createBookingController)
  );
  bookingRoutes.post(
    '/company',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    createCompanyBookingController.create.bind(createCompanyBookingController)
  );
  bookingRoutes.post(
    '/:bookingId/quote',
    requireRole(UserRoleDTO.CLIENT_COMPANY, UserRoleDTO.CLIENT_INDIVIDUAL),
    quoteBookingController.quote.bind(quoteBookingController)
  );
  bookingRoutes.post(
    '/:bookingId/pay',
    requireRole(UserRoleDTO.CLIENT_COMPANY, UserRoleDTO.CLIENT_INDIVIDUAL),
    payBookingController.pay.bind(payBookingController)
  );
  bookingRoutes.get(
    '/company/preregistration',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.get.bind(companyPreregistrationController)
  );
  bookingRoutes.post(
    '/company/preregistration/origins',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.addOrigin.bind(companyPreregistrationController)
  );
  bookingRoutes.patch(
    '/company/preregistration/origins/:locationId',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.updateOrigin.bind(companyPreregistrationController)
  );
  bookingRoutes.delete(
    '/company/preregistration/origins/:locationId',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.removeOrigin.bind(companyPreregistrationController)
  );
  bookingRoutes.post(
    '/company/preregistration/destinations',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.addDestination.bind(companyPreregistrationController)
  );
  bookingRoutes.patch(
    '/company/preregistration/destinations/:locationId',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.updateDestination.bind(companyPreregistrationController)
  );
  bookingRoutes.delete(
    '/company/preregistration/destinations/:locationId',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.removeDestination.bind(companyPreregistrationController)
  );
  bookingRoutes.post(
    '/company/preregistration/items',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.addItem.bind(companyPreregistrationController)
  );
  bookingRoutes.patch(
    '/company/preregistration/items/:itemId',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.updateItem.bind(companyPreregistrationController)
  );
  bookingRoutes.delete(
    '/company/preregistration/items/:itemId',
    requireRole(UserRoleDTO.CLIENT_COMPANY),
    companyPreregistrationController.removeItem.bind(companyPreregistrationController)
  );
  bookingRoutes.get(
    '/manual-classification/next',
    requireRole(UserRoleDTO.OPERATOR),
    manualClassifyBookingController.claimNext.bind(manualClassifyBookingController)
  );
  bookingRoutes.patch(
    '/:bookingId/manual-classification',
    requireRole(UserRoleDTO.OPERATOR),
    manualClassifyBookingController.classify.bind(manualClassifyBookingController)
  );
  bookingRoutes.post(
    '/:bookingId/manual-classification/reject',
    requireRole(UserRoleDTO.OPERATOR),
    manualClassifyBookingController.reject.bind(manualClassifyBookingController)
  );

  return bookingRoutes;
}
