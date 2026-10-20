import { ClaimManualClassificationCommand } from '../../../../../src/application/commands/claim-manual-classification/claim-manual-classification.command';
import { ClaimManualClassificationHandler } from '../../../../../src/application/commands/claim-manual-classification/claim-manual-classification.handler';
import type { ManualClassificationQueue } from '../../../../../src/application/contracts/manual-classification-queue';
import type { Coordinates } from '../../../../../src/domain/value-objects/coordinates';

describe('ClaimManualClassificationHandler', () => {
  let manualClassificationQueue: jest.Mocked<ManualClassificationQueue>;
  let handler: ClaimManualClassificationHandler;

  beforeEach(() => {
    manualClassificationQueue = {
      claimNext: jest.fn(),
      ensureClaimedBy: jest.fn(),
      complete: jest.fn(),
    };
    handler = new ClaimManualClassificationHandler(manualClassificationQueue);
  });

  it('should claim the next pending manual classification', async () => {
    const task = {
      bookingId: 'booking_123',
      userId: 'user_123',
      origin: [-56.16, -34.9] as Coordinates,
      destination: [-56.03, -34.83] as Coordinates,
      date: '2999-07-10',
      status: 'pending_classification' as const,
      queuedAt: '2026-06-23T10:00:00.000Z',
      items: [],
    };
    manualClassificationQueue.claimNext.mockResolvedValueOnce(task);

    const result = await handler.execute(new ClaimManualClassificationCommand(' operator_123 '));

    expect(result).toBe(task);
    expect(manualClassificationQueue.claimNext).toHaveBeenCalledWith('operator_123');
  });

  it('should reject empty operator user id', async () => {
    await expect(
      handler.execute(new ClaimManualClassificationCommand('   '))
    ).rejects.toMatchObject({
      message: 'operatorUserId is required and cannot be empty or whitespace',
      status: 400,
    });
    expect(manualClassificationQueue.claimNext).not.toHaveBeenCalled();
  });
});
