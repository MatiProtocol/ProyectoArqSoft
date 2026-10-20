import { logger } from '@move/logs-lib';
import { PayBookingHandler } from './application/commands/pay-booking/pay-booking.handler';
import { createExternalServiceCircuitBreaker } from './infrastructure/circuit-breakers/external-service-circuit-breaker';
import { SimulatedPaymentGateway } from './infrastructure/clients/simulated-payment.gateway';
import { connectMongo } from './infrastructure/config/database';
import { getPaymentConfig } from './infrastructure/config/payment';
import { BullMqPaymentRetryPublisher } from './infrastructure/queues/bullmq-payment-retry.publisher';
import { createPaymentRetryWorker } from './infrastructure/queues/payment-retry.worker';
import { BookingWriteRepository } from './infrastructure/repositories/implementations/booking.write.repository';

async function main(): Promise<void> {
  await connectMongo();
  logger.info('booking-payment-retry-worker MongoDB connected');

  const bookingWriteRepository = new BookingWriteRepository();
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
  const paymentRetryWorker = createPaymentRetryWorker(payBookingHandler);

  logger.info('booking-payment-retry-worker ready');

  paymentRetryWorker.on('failed', (job, err) => {
    logger.warn('booking-payment-retry-worker job failed', {
      jobId: job?.id,
      bookingId: job?.data.bookingId,
      userId: job?.data.userId,
      error: err.message,
    });
  });

  paymentRetryWorker.on('error', (err) => {
    logger.error('booking-payment-retry-worker error', {
      error: err.message,
    });
  });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    logger.info('booking-payment-retry-worker received shutdown signal', { signal });

    try {
      await paymentRetryWorker.close();
      logger.info('booking-payment-retry-worker stopped');
      process.exit(0);
    } catch (err) {
      logger.error('booking-payment-retry-worker shutdown failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void main();
