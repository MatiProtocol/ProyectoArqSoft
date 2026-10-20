jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import type { PayBookingCommand } from '../../../../../src/application/commands/pay-booking/pay-booking.command';
import { PayBookingHandler } from '../../../../../src/application/commands/pay-booking/pay-booking.handler';
import type {
  PaymentGatewayResult,
  PaymentRequest,
} from '../../../../../src/application/contracts/payment-gateway';
import type { PaymentRetryPublisher } from '../../../../../src/application/contracts/payment-retry.publisher';
import { BookingCustomerType } from '../../../../../src/domain/enums/booking-customer-type';
import { BookingPerformanceTier } from '../../../../../src/domain/enums/booking-performance-tier';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';
import type { ExternalServiceCircuitBreaker } from '../../../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker';

describe('PayBookingHandler', () => {
  let mockWriteRepository: jest.Mocked<IBookingWriteRepository>;
  let mockBreaker: jest.Mocked<
    ExternalServiceCircuitBreaker<[PaymentRequest], PaymentGatewayResult>
  >;
  let mockRetryPublisher: jest.Mocked<PaymentRetryPublisher>;
  let handler: PayBookingHandler;

  const validBookingId = '507f1f77bcf86cd799439011';

  const baseBooking = {
    id: validBookingId,
    userId: 'user_123',
    origin: [-56.1, -34.9] as [number, number],
    destination: [-56.2, -34.8] as [number, number],
    date: '2099-01-01',
    items: [],
    category: 'Furniture',
    status: BookingStatus.PENDING_PAYMENT,
    customerType: BookingCustomerType.INDIVIDUAL,
    performanceTier: BookingPerformanceTier.INDIVIDUAL,
    estimatedCost: 150,
  };

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      classifyManually: jest.fn(),
      getPendingClassification: jest.fn(),
      deletePendingClassification: jest.fn(),
      getClassified: jest.fn(),
      setQuote: jest.fn(),
      getPayable: jest.fn(),
      markPaid: jest.fn(),
      recordPayment: jest.fn(),
      recordAssignedResources: jest.fn(),
    };

    mockBreaker = {
      fire: jest.fn(),
      status: jest.fn(),
      close: jest.fn(),
    };

    mockRetryPublisher = {
      publishPaymentRetry: jest.fn(),
    };

    handler = new PayBookingHandler(mockWriteRepository, mockBreaker, mockRetryPublisher);
  });

  const command: PayBookingCommand = {
    bookingId: validBookingId,
    userId: 'user_123',
    methodToken: 'tok_visa',
  };

  it('should mark the booking as paid when the gateway accepts the payment', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce(baseBooking);
    mockBreaker.fire.mockResolvedValueOnce({ outcome: 'accepted', reference: 'ref_1' });

    const result = await handler.execute(command);

    expect(mockWriteRepository.getPayable).toHaveBeenCalledWith(validBookingId, 'user_123');
    expect(mockBreaker.fire).toHaveBeenCalledWith({
      bookingId: validBookingId,
      amount: 150,
      methodToken: 'tok_visa',
      simulateOutcome: undefined,
    });
    expect(mockWriteRepository.markPaid).toHaveBeenCalledWith(
      validBookingId,
      'user_123',
      expect.objectContaining({
        status: 'accepted',
        amount: 150,
        provider: 'stripe-sim',
        reference: 'ref_1',
        paidAt: expect.any(String),
      })
    );
    expect(mockWriteRepository.recordPayment).not.toHaveBeenCalled();
    expect(mockRetryPublisher.publishPaymentRetry).not.toHaveBeenCalled();
    expect(result).toEqual({
      bookingId: validBookingId,
      bookingStatus: 'payed',
      payment: { status: 'accepted', amount: 150, reference: 'ref_1' },
      retryQueued: false,
    });
  });

  it('should keep the booking pending payment when the gateway rejects the payment', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce(baseBooking);
    mockBreaker.fire.mockResolvedValueOnce({ outcome: 'rejected', reference: 'ref_2' });

    const result = await handler.execute(command);

    expect(mockWriteRepository.markPaid).not.toHaveBeenCalled();
    expect(mockWriteRepository.recordPayment).toHaveBeenCalledWith(
      validBookingId,
      'user_123',
      expect.objectContaining({ status: 'rejected', amount: 150, reference: 'ref_2' })
    );
    expect(result).toEqual({
      bookingId: validBookingId,
      bookingStatus: 'pending_payment',
      payment: { status: 'rejected', amount: 150, reference: 'ref_2' },
      retryQueued: false,
    });
  });

  it('should keep the booking pending payment when the gateway returns a pending outcome', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce(baseBooking);
    mockBreaker.fire.mockResolvedValueOnce({ outcome: 'pending', reference: 'ref_3' });

    const result = await handler.execute(command);

    expect(mockWriteRepository.recordPayment).toHaveBeenCalledWith(
      validBookingId,
      'user_123',
      expect.objectContaining({ status: 'pending', amount: 150, reference: 'ref_3' })
    );
    expect(result.bookingStatus).toBe('pending_payment');
    expect(result.payment.status).toBe('pending');
  });

  it('should record a pending payment with outage reason and queue a retry when the gateway is unavailable', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce(baseBooking);
    mockBreaker.fire.mockRejectedValueOnce(new Error('Payment gateway is unavailable'));

    const result = await handler.execute(command);

    expect(mockWriteRepository.recordPayment).toHaveBeenCalledWith(
      validBookingId,
      'user_123',
      expect.objectContaining({ status: 'pending', amount: 150, reason: 'outage' })
    );
    expect(mockRetryPublisher.publishPaymentRetry).toHaveBeenCalledWith({
      bookingId: validBookingId,
      userId: 'user_123',
      methodToken: 'tok_visa',
    });
    expect(result).toEqual({
      bookingId: validBookingId,
      bookingStatus: 'pending_payment',
      payment: { status: 'pending', amount: 150, reason: 'outage' },
      retryQueued: true,
    });
  });

  it('should record the outage reason as a string when the breaker throws a non-Error value', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce(baseBooking);
    mockBreaker.fire.mockRejectedValueOnce('circuit open');

    const result = await handler.execute(command);

    expect(mockRetryPublisher.publishPaymentRetry).toHaveBeenCalledWith({
      bookingId: validBookingId,
      userId: 'user_123',
      methodToken: 'tok_visa',
    });
    expect(result.retryQueued).toBe(true);
  });

  it('should propagate simulateOutcome to the gateway request', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce(baseBooking);
    mockBreaker.fire.mockResolvedValueOnce({ outcome: 'accepted', reference: 'ref_4' });

    await handler.execute({ ...command, simulateOutcome: 'accepted' });

    expect(mockBreaker.fire).toHaveBeenCalledWith(
      expect.objectContaining({ simulateOutcome: 'accepted' })
    );
  });

  it('should throw a conflict error when the booking has not been quoted yet', async () => {
    mockWriteRepository.getPayable.mockResolvedValueOnce({
      ...baseBooking,
      estimatedCost: undefined,
    });

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'Booking must be quoted before it can be paid.',
      status: 409,
    });
    expect(mockBreaker.fire).not.toHaveBeenCalled();
  });

  it('should propagate not-found/conflict errors from getPayable without calling the gateway', async () => {
    const notFoundError = Object.assign(new Error('Booking not found'), { status: 404 });
    mockWriteRepository.getPayable.mockRejectedValueOnce(notFoundError);

    await expect(handler.execute(command)).rejects.toMatchObject({ status: 404 });
    expect(mockBreaker.fire).not.toHaveBeenCalled();
  });

  it('should throw badRequest when bookingId is missing or invalid', async () => {
    await expect(handler.execute({ ...command, bookingId: '' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      handler.execute({ ...command, bookingId: 'not-an-object-id' })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockWriteRepository.getPayable).not.toHaveBeenCalled();
  });

  it('should throw badRequest when methodToken is missing or blank', async () => {
    await expect(handler.execute({ ...command, methodToken: '' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(handler.execute({ ...command, methodToken: '   ' })).rejects.toMatchObject({
      status: 400,
    });
    expect(mockWriteRepository.getPayable).not.toHaveBeenCalled();
  });
});
