import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import { PaymentStatus } from '../../../domain/enums/payment-status';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import type { PaymentResult } from '../../../domain/value-objects/payment-result';
import type { ExternalServiceCircuitBreaker } from '../../../infrastructure/circuit-breakers/external-service-circuit-breaker';
import type { PaymentGatewayResult, PaymentRequest } from '../../contracts/payment-gateway';
import type { PaymentRetryPublisher } from '../../contracts/payment-retry.publisher';
import type { PayBookingResultDto } from '../../dtos/pay-booking-result.dto';
import type { PayBookingCommand } from './pay-booking.command';

const PROVIDER_NAME = 'stripe-sim';

export class PayBookingHandler {
  constructor(
    private readonly writeRepository: IBookingWriteRepository,
    private readonly paymentBreaker: ExternalServiceCircuitBreaker<
      [PaymentRequest],
      PaymentGatewayResult
    >,
    private readonly paymentRetryPublisher: PaymentRetryPublisher
  ) {}

  async execute(command: PayBookingCommand): Promise<PayBookingResultDto> {
    this.validate(command);

    const bookingId = command.bookingId.trim();
    const booking = await this.writeRepository.getPayable(bookingId, command.userId);

    if (booking.estimatedCost === undefined) {
      throw ErrorFactory.conflict('Booking must be quoted before it can be paid.');
    }

    const amount = booking.estimatedCost;

    try {
      const result = await this.paymentBreaker.fire({
        bookingId,
        amount,
        methodToken: command.methodToken,
        simulateOutcome: command.simulateOutcome,
      });

      return await this.applyGatewayResult(bookingId, command.userId, amount, result);
    } catch (error) {
      return await this.handleOutage(bookingId, command.userId, command.methodToken, amount, error);
    }
  }

  private async applyGatewayResult(
    bookingId: string,
    userId: string,
    amount: number,
    result: PaymentGatewayResult
  ): Promise<PayBookingResultDto> {
    const payment: PaymentResult = {
      status: toPaymentStatus(result.outcome),
      amount,
      provider: PROVIDER_NAME,
      reference: result.reference,
      attempts: 1,
      updatedAt: new Date().toISOString(),
    };

    if (result.outcome === 'accepted') {
      payment.paidAt = payment.updatedAt;
      await this.writeRepository.markPaid(bookingId, userId, payment);
    } else {
      await this.writeRepository.recordPayment(bookingId, userId, payment);
    }

    logger.info('Booking payment processed', {
      bookingId,
      userId,
      outcome: result.outcome,
      amount,
    });

    return {
      bookingId,
      bookingStatus: result.outcome === 'accepted' ? 'payed' : 'pending_payment',
      payment: {
        status: payment.status,
        amount: payment.amount,
        reference: payment.reference,
      },
      retryQueued: false,
    };
  }

  private async handleOutage(
    bookingId: string,
    userId: string,
    methodToken: string,
    amount: number,
    error: unknown
  ): Promise<PayBookingResultDto> {
    const payment: PaymentResult = {
      status: PaymentStatus.PENDING,
      amount,
      provider: PROVIDER_NAME,
      reason: 'outage',
      attempts: 1,
      updatedAt: new Date().toISOString(),
    };

    await this.writeRepository.recordPayment(bookingId, userId, payment);
    await this.paymentRetryPublisher.publishPaymentRetry({ bookingId, userId, methodToken });

    logger.warn('Payment gateway unavailable, queued for retry', {
      bookingId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      bookingId,
      bookingStatus: 'pending_payment',
      payment: {
        status: payment.status,
        amount: payment.amount,
        reason: payment.reason,
      },
      retryQueued: true,
    };
  }

  private validate(command: PayBookingCommand): void {
    if (
      typeof command.bookingId !== 'string' ||
      command.bookingId.trim() === '' ||
      !Types.ObjectId.isValid(command.bookingId.trim())
    ) {
      throw ErrorFactory.badRequest('bookingId must be a valid id');
    }

    if (typeof command.methodToken !== 'string' || command.methodToken.trim() === '') {
      throw ErrorFactory.badRequest('methodToken is required and cannot be empty or whitespace');
    }
  }
}

function toPaymentStatus(outcome: PaymentGatewayResult['outcome']): PaymentStatus {
  if (outcome === 'accepted') return PaymentStatus.ACCEPTED;
  if (outcome === 'rejected') return PaymentStatus.REJECTED;
  return PaymentStatus.PENDING;
}
