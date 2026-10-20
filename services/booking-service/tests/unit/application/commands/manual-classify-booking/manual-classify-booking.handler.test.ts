jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { logger } from '@move/logs-lib';
import { ManualClassifyBookingCommand } from '../../../../../src/application/commands/manual-classify-booking/manual-classify-booking.command';
import { ManualClassifyBookingHandler } from '../../../../../src/application/commands/manual-classify-booking/manual-classify-booking.handler';
import type { CategoryCatalogClient } from '../../../../../src/application/contracts/category-catalog';
import type { ManualClassificationQueue } from '../../../../../src/application/contracts/manual-classification-queue';
import type { IBookingWriteRepository } from '../../../../../src/domain/repositories/booking.write.repository';

describe('ManualClassifyBookingHandler', () => {
  const bookingId = '507f1f77bcf86cd799439011';
  const itemId = '507f1f77bcf86cd799439012';
  let mockWriteRepository: jest.Mocked<IBookingWriteRepository>;
  let mockCategoryCatalogClient: jest.Mocked<CategoryCatalogClient>;
  let mockManualClassificationQueue: jest.Mocked<ManualClassificationQueue>;
  let handler: ManualClassifyBookingHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      classifyManually: jest.fn().mockResolvedValue(undefined),
      getPendingClassification: jest.fn(),
      deletePendingClassification: jest.fn(),
      getClassified: jest.fn(),
      setQuote: jest.fn(),
      getPayable: jest.fn(),
      markPaid: jest.fn(),
      recordPayment: jest.fn(),
      recordAssignedResources: jest.fn(),
    };
    mockCategoryCatalogClient = {
      getActiveCategories: jest.fn().mockResolvedValue([
        { id: 1, nameEn: 'Furniture', nameEs: 'Muebles', description: 'Home items' },
        { id: 2, nameEn: 'Boxes', nameEs: 'Cajas' },
      ]),
    };
    mockManualClassificationQueue = {
      claimNext: jest.fn(),
      ensureClaimedBy: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
    };
    handler = new ManualClassifyBookingHandler(
      mockWriteRepository,
      mockCategoryCatalogClient,
      mockManualClassificationQueue
    );
    jest.clearAllMocks();
  });

  it('should classify a pending booking with canonical MOVE categories', async () => {
    const command = new ManualClassifyBookingCommand(' 507f1f77bcf86cd799439011 ', 'operator_123', [
      { itemId, category: ' muebles ' },
    ]);

    await handler.execute(command);

    expect(mockManualClassificationQueue.ensureClaimedBy).toHaveBeenCalledWith(
      bookingId,
      'operator_123'
    );
    expect(mockCategoryCatalogClient.getActiveCategories).toHaveBeenCalledTimes(1);
    expect(mockWriteRepository.classifyManually).toHaveBeenCalledWith(bookingId, [
      { itemId, category: 'Furniture' },
    ]);
    expect(mockManualClassificationQueue.complete).toHaveBeenCalledWith(bookingId, 'operator_123');
    expect(logger.info).toHaveBeenCalledWith('Booking manually classified', {
      bookingId,
      operatorUserId: 'operator_123',
      status: 'classified',
      itemCount: 1,
      category: 'Furniture',
    });
  });

  it('should reject and log when category is not in MOVE catalog', async () => {
    const command = new ManualClassifyBookingCommand(bookingId, 'operator_123', [
      { itemId, category: 'Piano' },
    ]);

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'category is not a valid MOVE category',
      status: 400,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Manual classification rejected because category is not in MOVE catalog',
      {
        bookingId,
        operatorUserId: 'operator_123',
        itemId,
        category: 'Piano',
      }
    );
    expect(mockWriteRepository.classifyManually).not.toHaveBeenCalled();
    expect(mockManualClassificationQueue.complete).not.toHaveBeenCalled();
  });

  it('should reject invalid booking id before reading the catalog', async () => {
    const command = new ManualClassifyBookingCommand('invalid', 'operator_123', [
      { itemId, category: 'Furniture' },
    ]);

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'bookingId must be a valid id',
      status: 400,
    });
    expect(mockCategoryCatalogClient.getActiveCategories).not.toHaveBeenCalled();
    expect(mockManualClassificationQueue.ensureClaimedBy).not.toHaveBeenCalled();
    expect(mockWriteRepository.classifyManually).not.toHaveBeenCalled();
  });

  it('should reject duplicated item ids', async () => {
    const command = new ManualClassifyBookingCommand(bookingId, 'operator_123', [
      { itemId, category: 'Furniture' },
      { itemId, category: 'Boxes' },
    ]);

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'itemId cannot be duplicated',
      status: 400,
    });
    expect(mockCategoryCatalogClient.getActiveCategories).not.toHaveBeenCalled();
    expect(mockManualClassificationQueue.ensureClaimedBy).not.toHaveBeenCalled();
    expect(mockWriteRepository.classifyManually).not.toHaveBeenCalled();
  });

  it('should reject when there are no active MOVE categories', async () => {
    mockCategoryCatalogClient.getActiveCategories.mockResolvedValueOnce([]);
    const command = new ManualClassifyBookingCommand(bookingId, 'operator_123', [
      { itemId, category: 'Furniture' },
    ]);

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'no active MOVE categories are available',
      status: 400,
    });
    expect(mockWriteRepository.classifyManually).not.toHaveBeenCalled();
  });

  it('should reject when the classification is not claimed by this operator', async () => {
    mockManualClassificationQueue.ensureClaimedBy.mockRejectedValueOnce(
      Object.assign(new Error('Manual classification is not claimed by this operator.'), {
        status: 409,
      })
    );
    const command = new ManualClassifyBookingCommand(bookingId, 'operator_123', [
      { itemId, category: 'Furniture' },
    ]);

    await expect(handler.execute(command)).rejects.toMatchObject({
      message: 'Manual classification is not claimed by this operator.',
      status: 409,
    });
    expect(mockCategoryCatalogClient.getActiveCategories).not.toHaveBeenCalled();
    expect(mockWriteRepository.classifyManually).not.toHaveBeenCalled();
    expect(mockManualClassificationQueue.complete).not.toHaveBeenCalled();
  });
});
