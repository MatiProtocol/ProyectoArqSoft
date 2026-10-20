import 'express-async-errors';
import { GetRolesUserHandler, UserAuthReadRepository } from '@move/auth-lib';
import { createErrorHandler, envConfigFromProcess } from '@move/errors-lib';
import { metricsHandler, requestLogger } from '@move/logs-lib';
import express from 'express';
import { ClaimManualClassificationHandler } from './application/commands/claim-manual-classification/claim-manual-classification.handler';
import { CreateBookingHandler } from './application/commands/create-booking/create-booking.handler';
import { CreateCompanyBookingHandler } from './application/commands/create-company-booking/create-company-booking.handler';
import { ManageCompanyPreregistrationHandler } from './application/commands/manage-company-preregistration/manage-company-preregistration.handler';
import { ManualClassifyBookingHandler } from './application/commands/manual-classify-booking/manual-classify-booking.handler';
import { PayBookingHandler } from './application/commands/pay-booking/pay-booking.handler';
import { QuoteBookingHandler } from './application/commands/quote-booking/quote-booking.handler';
import { RejectManualClassificationHandler } from './application/commands/reject-manual-classification/reject-manual-classification.handler';
import { GetCompanyPreregistrationHandler } from './application/queries/get-company-preregistration/get-company-preregistration.handler';
import { ListCustomerBookingsHandler } from './application/queries/list-customer-bookings/list-customer-bookings.handler';
import { createExternalServiceCircuitBreaker } from './infrastructure/circuit-breakers/external-service-circuit-breaker';
import { GeminiItemClassifier } from './infrastructure/classification/gemini-item-classifier';
import { HttpCategoryCatalogClient } from './infrastructure/clients/category-catalog.client';
import { HttpIdentityUserClient } from './infrastructure/clients/identity-user.client';
import { OsrmGeoDistanceClient } from './infrastructure/clients/osrm.client';
import { SimulatedPaymentGateway } from './infrastructure/clients/simulated-payment.gateway';
import { getCategoryCatalogConfig } from './infrastructure/config/category-catalog';
import { getGeminiConfig } from './infrastructure/config/gemini';
import { getIdentityServiceConfig } from './infrastructure/config/identity-service';
import { getOsrmConfig } from './infrastructure/config/osrm';
import { getPaymentConfig } from './infrastructure/config/payment';
import { getBookingHealth } from './infrastructure/health/booking-health';
import { MongoRedisFrequentCompanyClientProvider } from './infrastructure/providers/mongo-redis-frequent-company-client.provider';
import { BullMqCustomerEmailPublisher } from './infrastructure/queues/bullmq-customer-email.publisher';
import { BullMqManualClassificationQueue } from './infrastructure/queues/bullmq-manual-classification.queue';
import { BullMqPaymentRetryPublisher } from './infrastructure/queues/bullmq-payment-retry.publisher';
import { BullMqPendingClassificationPublisher } from './infrastructure/queues/bullmq-pending-classification.publisher';
import { BookingReadRepository } from './infrastructure/repositories/implementations/booking.read.repository';
import { BookingWriteRepository } from './infrastructure/repositories/implementations/booking.write.repository';
import { CachedTopCompanyPreregistrationReadRepository } from './infrastructure/repositories/implementations/cached-top-company-preregistration.read.repository';
import { CompanyPreregistrationReadRepository } from './infrastructure/repositories/implementations/company-preregistration.read.repository';
import { CompanyPreregistrationWriteRepository } from './infrastructure/repositories/implementations/company-preregistration.write.repository';
import { CompanyPreregistrationController } from './presentation/controllers/company-preregistration.controller';
import { CreateBookingController } from './presentation/controllers/create-booking.controller';
import { CreateCompanyBookingController } from './presentation/controllers/create-company-booking.controller';
import { ListCustomerBookingsController } from './presentation/controllers/list-customer-bookings.controller';
import { ManualClassifyBookingController } from './presentation/controllers/manual-classify-booking.controller';
import { PayBookingController } from './presentation/controllers/pay-booking.controller';
import { QuoteBookingController } from './presentation/controllers/quote-booking.controller';
import { createBookingRoutes } from './presentation/routes/booking.routes';

export const app = express();

app.use(express.json());
app.use(requestLogger);
app.get('/health', async (_req, res) => res.status(200).json(await getBookingHealth()));
app.get('/metrics', metricsHandler);
app.get('/', (_req, res) => res.send('ok'));

type UserAuthDatabase = ConstructorParameters<typeof UserAuthReadRepository>[0];

export function setupRoutes(db: UserAuthDatabase) {
  const userAuthReadRepository = new UserAuthReadRepository(db);
  const getRolesHandler = new GetRolesUserHandler(userAuthReadRepository);
  const bookingReadRepository = new BookingReadRepository();
  const bookingWriteRepository = new BookingWriteRepository();
  const companyPreregistrationReadRepository = new CompanyPreregistrationReadRepository();
  const topCompanyPreregistrationReadRepository = new CachedTopCompanyPreregistrationReadRepository(
    companyPreregistrationReadRepository
  );
  const companyPreregistrationWriteRepository = new CompanyPreregistrationWriteRepository();
  const categoryCatalogClient = new HttpCategoryCatalogClient(getCategoryCatalogConfig());
  const identityUserClient = new HttpIdentityUserClient(getIdentityServiceConfig());
  const itemClassifier = new GeminiItemClassifier(getGeminiConfig(), categoryCatalogClient);
  const pendingClassificationPublisher = new BullMqPendingClassificationPublisher();
  const customerEmailPublisher = new BullMqCustomerEmailPublisher();
  const manualClassificationQueue = new BullMqManualClassificationQueue();
  const frequentCompanyClientProvider = new MongoRedisFrequentCompanyClientProvider();
  const createBookingHandler = new CreateBookingHandler(
    bookingWriteRepository,
    itemClassifier,
    pendingClassificationPublisher
  );
  const createCompanyBookingHandler = new CreateCompanyBookingHandler(
    bookingWriteRepository,
    companyPreregistrationReadRepository,
    frequentCompanyClientProvider,
    topCompanyPreregistrationReadRepository
  );
  const getCompanyPreregistrationHandler = new GetCompanyPreregistrationHandler(
    companyPreregistrationReadRepository
  );
  const listCustomerBookingsHandler = new ListCustomerBookingsHandler(bookingReadRepository);
  const manageCompanyPreregistrationHandler = new ManageCompanyPreregistrationHandler(
    companyPreregistrationWriteRepository,
    categoryCatalogClient
  );
  const manualClassifyBookingHandler = new ManualClassifyBookingHandler(
    bookingWriteRepository,
    categoryCatalogClient,
    manualClassificationQueue
  );
  const claimManualClassificationHandler = new ClaimManualClassificationHandler(
    manualClassificationQueue
  );
  const rejectManualClassificationHandler = new RejectManualClassificationHandler(
    bookingWriteRepository,
    manualClassificationQueue,
    identityUserClient,
    customerEmailPublisher
  );
  const osrmConfig = getOsrmConfig();
  const geoDistanceClient = new OsrmGeoDistanceClient(osrmConfig);
  const quoteBookingHandler = new QuoteBookingHandler(
    bookingWriteRepository,
    geoDistanceClient,
    categoryCatalogClient,
    {
      baseRatePerKm: osrmConfig.baseRatePerKm,
      surchargePercentPerRule: osrmConfig.surchargePercentPerRule,
    }
  );
  const paymentConfig = getPaymentConfig();
  const paymentGateway = new SimulatedPaymentGateway(paymentConfig);
  const paymentBreaker = createExternalServiceCircuitBreaker(
    paymentGateway.charge.bind(paymentGateway),
    {
      name: 'payment',
      serviceName: 'Payment gateway',
      timeoutMs: paymentConfig.timeoutMs,
      fallbackMessage: 'Payment gateway is temporarily unavailable',
      retryAfter: '30s',
    }
  );
  const paymentRetryPublisher = new BullMqPaymentRetryPublisher();
  const payBookingHandler = new PayBookingHandler(
    bookingWriteRepository,
    paymentBreaker,
    paymentRetryPublisher
  );

  app.use(
    '/api/v1/bookings',
    createBookingRoutes({
      getRolesHandler,
      createBookingController: new CreateBookingController(createBookingHandler),
      listCustomerBookingsController: new ListCustomerBookingsController(
        listCustomerBookingsHandler
      ),
      createCompanyBookingController: new CreateCompanyBookingController(
        createCompanyBookingHandler
      ),
      companyPreregistrationController: new CompanyPreregistrationController(
        manageCompanyPreregistrationHandler,
        getCompanyPreregistrationHandler
      ),
      manualClassifyBookingController: new ManualClassifyBookingController(
        manualClassifyBookingHandler,
        claimManualClassificationHandler,
        rejectManualClassificationHandler
      ),
      quoteBookingController: new QuoteBookingController(quoteBookingHandler),
      payBookingController: new PayBookingController(payBookingHandler),
    })
  );
  app.use(createErrorHandler(envConfigFromProcess()));
}
