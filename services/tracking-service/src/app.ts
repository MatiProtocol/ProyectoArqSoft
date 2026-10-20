import 'express-async-errors';
import { GetRolesUserHandler, UserAuthReadRepository } from '@move/auth-lib';
import { createErrorHandler, envConfigFromProcess } from '@move/errors-lib';
import { metricsHandler, requestLogger } from '@move/logs-lib';
import express from 'express';
import { AssignTransferHandler } from './application/commands/assign-transfer/assign-transfer.handler';
import { FinishTransferHandler } from './application/commands/finish-transfer/finish-transfer.handler';
import { IngestGpsReadingHandler } from './application/commands/ingest-gps-reading/ingest-gps-reading.handler';
import { StartTransferHandler } from './application/commands/start-transfer/start-transfer.handler';
import { GetTransferPositionsHandler } from './application/queries/get-transfer-positions/get-transfer-positions.handler';
import { ListActiveTransfersHandler } from './application/queries/list-active-transfers/list-active-transfers.handler';
import { RegisteredDeviceCache } from './infrastructure/cache/registered-devices.cache';
import { getDeviceAuthConfig } from './infrastructure/config/device-auth';
import { BullMqGpsIngestPublisher } from './infrastructure/queues/bullmq-gps-ingest.publisher';
import { BullMqTransferAssignedPublisher } from './infrastructure/queues/bullmq-transfer-assigned.publisher';
import { BookingReadRepository } from './infrastructure/repositories/implementations/booking.read.repository';
import { GpsReadingReadRepository } from './infrastructure/repositories/implementations/gps-reading.read.repository';
import { TransferReadRepository } from './infrastructure/repositories/implementations/transfer.read.repository';
import { TransferWriteRepository } from './infrastructure/repositories/implementations/transfer.write.repository';
import { VehicleReadRepository } from './infrastructure/repositories/implementations/vehicle.read.repository';
import { GpsController } from './presentation/controllers/gps.controller';
import { TransferController } from './presentation/controllers/transfer.controller';
import { createTrackingRoutes } from './presentation/routes/tracking.routes';

export const app = express();

app.use(express.json());
app.use(requestLogger);
app.get('/health', (_req, res) => res.sendStatus(200));
app.get('/metrics', metricsHandler);
app.get('/', (_req, res) => res.send('ok'));

type UserAuthDatabase = ConstructorParameters<typeof UserAuthReadRepository>[0];

export function setupRoutes(db: UserAuthDatabase) {
  const userAuthReadRepository = new UserAuthReadRepository(db);
  const getRolesHandler = new GetRolesUserHandler(userAuthReadRepository);

  const transferReadRepository = new TransferReadRepository();
  const transferWriteRepository = new TransferWriteRepository();
  const bookingReadRepository = new BookingReadRepository();
  const vehicleReadRepository = new VehicleReadRepository();
  const gpsReadingReadRepository = new GpsReadingReadRepository();
  const registeredDeviceProvider = new RegisteredDeviceCache();
  const gpsIngestPublisher = new BullMqGpsIngestPublisher();
  const transferAssignedPublisher = new BullMqTransferAssignedPublisher();

  const assignHandler = new AssignTransferHandler(
    bookingReadRepository,
    vehicleReadRepository,
    transferReadRepository,
    transferWriteRepository,
    transferAssignedPublisher
  );
  const startHandler = new StartTransferHandler(transferReadRepository, transferWriteRepository);
  const finishHandler = new FinishTransferHandler(transferReadRepository, transferWriteRepository);
  const ingestHandler = new IngestGpsReadingHandler(registeredDeviceProvider, gpsIngestPublisher);
  const listActiveHandler = new ListActiveTransfersHandler(transferReadRepository);
  const getPositionsHandler = new GetTransferPositionsHandler(gpsReadingReadRepository);

  const transferController = new TransferController(
    assignHandler,
    startHandler,
    finishHandler,
    listActiveHandler,
    getPositionsHandler
  );
  const gpsController = new GpsController(ingestHandler);

  app.use(
    '/api/v1/tracking',
    createTrackingRoutes({
      getRolesHandler,
      gpsController,
      transferController,
      deviceAuthConfig: getDeviceAuthConfig(),
    })
  );
  app.use(createErrorHandler(envConfigFromProcess()));
}
