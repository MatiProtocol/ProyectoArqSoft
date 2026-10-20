jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import { logger } from '@move/logs-lib';
import { RejectManualClassificationCommand } from '../../../../../src/application/commands/reject-manual-classification/reject-manual-classification.command';
import { RejectManualClassificationHandler } from '../../../../../src/application/commands/reject-manual-classification/reject-manual-classification.handler';
import type { CustomerEmailPublisher } from '../../../../../src/application/contracts/customer-email.publisher';
import type { CustomerProfileClient } from '../../../../../src/application/contracts/customer-profile.client';
import type { ManualClassificationQueue } from '../../../../../src/application/contracts/manual-classification-queue';
import { Booking } from '../../../../../src/domain/entities/booking';
import { Item } from '../../../../../src/domain/entities/item';
import { BookingStatus } from '../../../../../src/domain/enums/booking-status';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';

describe('RejectManualClassificationHandler', () => {
  const bookingId = '507f1f77bcf86cd799439011';
  let writeRepository: jest.Mocked<IBookingWriteRepository>;
  let manualClassificationQueue: jest.Mocked<ManualClassificationQueue>;
  let customerProfileClient: jest.Mocked<CustomerProfileClient>;
  let customerEmailPublisher: jest.Mocked<CustomerEmailPublisher>;
  let handler: RejectManualClassificationHandler;

  beforeEach(() => {
    const deletedBooking = new Booking(
      bookingId,
      'user_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2026-07-10',
      [new Item('507f1f77bcf86cd799439012', 'Objeto no soportado')],
      undefined,
      BookingStatus.PENDING_CLASSIFICATION
    );
    writeRepository = {
      create: jest.fn(),
      classifyManually: jest.fn(),
      getPendingClassification: jest.fn().mockResolvedValue(deletedBooking),
      deletePendingClassification: jest.fn().mockResolvedValue(deletedBooking),
      getClassified: jest.fn(),
      setQuote: jest.fn(),
      getPayable: jest.fn(),
      markPaid: jest.fn(),
      recordPayment: jest.fn(),
      recordAssignedResources: jest.fn(),
    };
    manualClassificationQueue = {
      claimNext: jest.fn(),
      ensureClaimedBy: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
    };
    customerProfileClient = {
      getUserDetail: jest.fn().mockResolvedValue({
        id: 'user_123',
        email: 'client@example.com',
      }),
    };
    customerEmailPublisher = {
      publishBookingRejected: jest.fn().mockResolvedValue(undefined),
    };
    handler = new RejectManualClassificationHandler(
      writeRepository,
      manualClassificationQueue,
      customerProfileClient,
      customerEmailPublisher
    );
    jest.clearAllMocks();
  });

  it('should delete a claimed pending classification booking, queue email and complete the queue job', async () => {
    const command = new RejectManualClassificationCommand(` ${bookingId} `, ' operator_123 ');

    await handler.execute(command);

    expect(manualClassificationQueue.ensureClaimedBy).toHaveBeenCalledWith(
      bookingId,
      'operator_123'
    );
    expect(writeRepository.getPendingClassification).toHaveBeenCalledWith(bookingId);
    expect(customerProfileClient.getUserDetail).toHaveBeenCalledWith('user_123');
    expect(writeRepository.deletePendingClassification).toHaveBeenCalledWith(bookingId);
    expect(customerEmailPublisher.publishBookingRejected).toHaveBeenCalledWith({
      bookingId,
      userId: 'user_123',
      to: 'client@example.com',
      subject: 'No pudimos procesar tu solicitud en MOVE',
      bodyText: expect.stringContaining('Objeto no soportado'),
      itemDescriptions: ['Objeto no soportado'],
    });
    expect(manualClassificationQueue.complete).toHaveBeenCalledWith(bookingId, 'operator_123');
    expect(logger.info).toHaveBeenCalledWith(
      'Booking rejected, removed and customer notification queued',
      {
        bookingId,
        operatorUserId: 'operator_123',
        userId: 'user_123',
      }
    );
  });

  it('should reject invalid booking id', async () => {
    await expect(
      handler.execute(new RejectManualClassificationCommand('invalid', 'operator_123'))
    ).rejects.toMatchObject({
      message: 'bookingId must be a valid id',
      status: 400,
    });
    expect(manualClassificationQueue.ensureClaimedBy).not.toHaveBeenCalled();
    expect(writeRepository.getPendingClassification).not.toHaveBeenCalled();
    expect(writeRepository.deletePendingClassification).not.toHaveBeenCalled();
    expect(customerEmailPublisher.publishBookingRejected).not.toHaveBeenCalled();
  });

  it('should not delete when booking is not claimed by this operator', async () => {
    manualClassificationQueue.ensureClaimedBy.mockRejectedValueOnce(
      Object.assign(new Error('Manual classification is not claimed by this operator.'), {
        status: 409,
      })
    );

    await expect(
      handler.execute(new RejectManualClassificationCommand(bookingId, 'operator_123'))
    ).rejects.toMatchObject({
      message: 'Manual classification is not claimed by this operator.',
      status: 409,
    });
    expect(writeRepository.getPendingClassification).not.toHaveBeenCalled();
    expect(writeRepository.deletePendingClassification).not.toHaveBeenCalled();
    expect(customerEmailPublisher.publishBookingRejected).not.toHaveBeenCalled();
    expect(manualClassificationQueue.complete).not.toHaveBeenCalled();
  });
});
