import {
  attachRoles,
  ensureUserIdFromToken,
  GetRolesUserHandler,
  requireRole,
  UserAuthReadRepository,
  UserRoleDTO,
  validateJwt,
} from '@move/auth-lib';
import { Router } from 'express';
import multer from 'multer';
import { CreateCategoryHandler } from '../../application/commands/create-category/create-category.handler';
import { CreateVehicleHandler } from '../../application/commands/create-vehicle/create-vehicle.handler';
import { CreateZoneHandler } from '../../application/commands/create-zone/create-zone.handler';
import { DeleteVehicleHandler } from '../../application/commands/delete-vehicle/delete-vehicle.handler';
import { DeleteZoneHandler } from '../../application/commands/delete-zone/delete-zone.handler';
import { ImportCategoriesHandler } from '../../application/commands/import-categories/import-categories.handler';
import { SetCategoryRulesHandler } from '../../application/commands/set-category-rules/set-category-rules.handler';
import { UpdateCategoryHandler } from '../../application/commands/update-category/update-category.handler';
import { UpdateVehicleHandler } from '../../application/commands/update-vehicle/update-vehicle.handler';
import { UpdateZoneHandler } from '../../application/commands/update-zone/update-zone.handler';
import { ListCategoriesHandler } from '../../application/queries/list-categories/list-categories.handler';
import { ListRulesHandler } from '../../application/queries/list-rules/list-rules.handler';
import { ListVehiclesHandler } from '../../application/queries/list-vehicles/list-vehicles.handler';
import { ListZonesHandler } from '../../application/queries/list-zones/list-zones.handler';
import { BookingUsageReadRepository } from '../../infrastructure/repositories/booking-usage.read.repository';
import { CategoryReadRepository } from '../../infrastructure/repositories/category.read.repository';
import { CategoryWriteRepository } from '../../infrastructure/repositories/category.write.repository';
import { RuleReadRepository } from '../../infrastructure/repositories/rule.read.repository';
import { VehicleReadRepository } from '../../infrastructure/repositories/vehicle.read.repository';
import { VehicleWriteRepository } from '../../infrastructure/repositories/vehicle.write.repository';
import { ZoneReadRepository } from '../../infrastructure/repositories/zone.read.repository';
import { ZoneWriteRepository } from '../../infrastructure/repositories/zone.write.repository';
import { CategoryController } from '../controllers/category.controller';
import { RuleController } from '../controllers/rule.controller';
import { VehicleController } from '../controllers/vehicle.controller';
import { ZoneController } from '../controllers/zone.controller';
import { requireInternalToken } from '../middlewares/require-internal-token';
import { withErrorFactory } from '../middlewares/with-error-factory';

const upload = multer({ storage: multer.memoryStorage() });
type UserAuthDatabase = ConstructorParameters<typeof UserAuthReadRepository>[0];

function requireRoleSafe(...allowedRoles: UserRoleDTO[]) {
  return withErrorFactory(requireRole(...allowedRoles));
}

export function createConfigurationRoutes(db: UserAuthDatabase) {
  const configurationRoutes = Router();
  const userAuthReadRepo = new UserAuthReadRepository(db);
  const getRolesHandler = new GetRolesUserHandler(userAuthReadRepo);

  const categoryController = buildCategoryController();
  const ruleController = buildRuleController();
  const zoneController = buildZoneController();
  const vehicleController = buildVehicleController();

  registerInternalCategoryRoutes(configurationRoutes, categoryController);

  configurationRoutes.use(validateJwt);
  configurationRoutes.use(withErrorFactory(ensureUserIdFromToken));
  configurationRoutes.use(withErrorFactory(attachRoles(getRolesHandler)));

  registerCategoryRoutes(configurationRoutes, categoryController);
  registerRuleRoutes(configurationRoutes, ruleController);
  registerZoneRoutes(configurationRoutes, zoneController);
  registerVehicleRoutes(configurationRoutes, vehicleController);

  return configurationRoutes;
}

function buildCategoryController(): CategoryController {
  const categoryReadRepository = new CategoryReadRepository();
  const categoryWriteRepository = new CategoryWriteRepository();
  const ruleReadRepository = new RuleReadRepository();
  const bookingUsageReadRepository = new BookingUsageReadRepository();
  return new CategoryController(
    new CreateCategoryHandler(categoryWriteRepository),
    new UpdateCategoryHandler(categoryWriteRepository),
    new ImportCategoriesHandler(categoryWriteRepository),
    new ListCategoriesHandler(categoryReadRepository),
    new SetCategoryRulesHandler(
      categoryReadRepository,
      categoryWriteRepository,
      ruleReadRepository,
      bookingUsageReadRepository
    )
  );
}

function buildRuleController(): RuleController {
  const ruleReadRepository = new RuleReadRepository();
  return new RuleController(new ListRulesHandler(ruleReadRepository));
}

function buildZoneController(): ZoneController {
  const zoneWriteRepository = new ZoneWriteRepository();
  const zoneReadRepository = new ZoneReadRepository();
  return new ZoneController(
    new CreateZoneHandler(zoneWriteRepository),
    new UpdateZoneHandler(zoneWriteRepository),
    new DeleteZoneHandler(zoneWriteRepository),
    new ListZonesHandler(zoneReadRepository)
  );
}

function buildVehicleController(): VehicleController {
  const vehicleWriteRepository = new VehicleWriteRepository();
  const vehicleReadRepository = new VehicleReadRepository();
  return new VehicleController(
    new CreateVehicleHandler(vehicleWriteRepository),
    new UpdateVehicleHandler(vehicleWriteRepository),
    new DeleteVehicleHandler(vehicleWriteRepository),
    new ListVehiclesHandler(vehicleReadRepository)
  );
}

function registerCategoryRoutes(routes: Router, controller: CategoryController): void {
  routes.post(
    '/categories/import',
    requireRoleSafe(UserRoleDTO.ADMIN),
    upload.single('file'),
    controller.importCsv.bind(controller)
  );
  routes.post(
    '/categories',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.create.bind(controller)
  );
  routes.patch(
    '/categories/:id',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.update.bind(controller)
  );
  routes.put(
    '/categories/:id/rules',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.setRules.bind(controller)
  );
}

function registerRuleRoutes(routes: Router, controller: RuleController): void {
  routes.get(
    '/rules',
    requireRoleSafe(UserRoleDTO.ADMIN, UserRoleDTO.OPERATOR),
    controller.list.bind(controller)
  );
}

function registerInternalCategoryRoutes(routes: Router, controller: CategoryController): void {
  routes.get(
    '/categories/catalog',
    requireInternalToken(),
    controller.listCatalog.bind(controller)
  );
}

function registerZoneRoutes(routes: Router, controller: ZoneController): void {
  routes.post('/zones', requireRoleSafe(UserRoleDTO.ADMIN), controller.create.bind(controller));
  routes.patch(
    '/zones/:id',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.update.bind(controller)
  );
  routes.delete(
    '/zones/:id',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.delete.bind(controller)
  );
  routes.get(
    '/zones',
    requireRoleSafe(UserRoleDTO.ADMIN, UserRoleDTO.OPERATOR),
    controller.list.bind(controller)
  );
}

function registerVehicleRoutes(routes: Router, controller: VehicleController): void {
  routes.post('/vehicles', requireRoleSafe(UserRoleDTO.ADMIN), controller.create.bind(controller));
  routes.patch(
    '/vehicles/:id',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.update.bind(controller)
  );
  routes.delete(
    '/vehicles/:id',
    requireRoleSafe(UserRoleDTO.ADMIN),
    controller.delete.bind(controller)
  );
  routes.get(
    '/vehicles',
    requireRoleSafe(UserRoleDTO.ADMIN, UserRoleDTO.OPERATOR),
    controller.list.bind(controller)
  );
}
