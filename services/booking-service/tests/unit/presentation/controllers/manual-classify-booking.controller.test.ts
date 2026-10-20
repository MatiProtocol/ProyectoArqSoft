import type { Request, Response } from 'express';
import type { ClaimManualClassificationHandler } from '../../../../src/application/commands/claim-manual-classification/claim-manual-classification.handler';
import { ManualClassifyBookingCommand } from '../../../../src/application/commands/manual-classify-booking/manual-classify-booking.command';
import type { ManualClassifyBookingHandler } from '../../../../src/application/commands/manual-classify-booking/manual-classify-booking.handler';
import { RejectManualClassificationCommand } from '../../../../src/application/commands/reject-manual-classification/reject-manual-classification.command';
import type { RejectManualClassificationHandler } from '../../../../src/application/commands/reject-manual-classification/reject-manual-classification.handler';
import { ManualClassifyBookingController } from '../../../../src/presentation/controllers/manual-classify-booking.controller';

const mockExecute = jest.fn();
const mockClaimExecute = jest.fn();
const mockRejectExecute = jest.fn();
const mockHandler = {
  execute: mockExecute,
} as unknown as jest.Mocked<ManualClassifyBookingHandler>;
const mockClaimHandler = {
  execute: mockClaimExecute,
} as unknown as jest.Mocked<ClaimManualClassificationHandler>;
const mockRejectHandler = {
  execute: mockRejectExecute,
} as unknown as jest.Mocked<RejectManualClassificationHandler>;

describe('ManualClassifyBookingController', () => {
  let controller: ManualClassifyBookingController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new ManualClassifyBookingController(
      mockHandler,
      mockClaimHandler,
      mockRejectHandler
    );
    req = {
      params: {
        bookingId: '507f1f77bcf86cd799439011',
      },
      user: {
        id: 'auth0|operator-id',
        roles: [],
      },
      body: {
        items: [{ itemId: '507f1f77bcf86cd799439012', category: 'Furniture' }],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should claim the next manual classification for the authenticated operator', async () => {
    const task = {
      bookingId: '507f1f77bcf86cd799439011',
      userId: 'client_123',
      origin: [-56.16, -34.9],
      destination: [-56.03, -34.83],
      date: '2999-07-10',
      status: 'pending_classification',
      queuedAt: '2026-06-23T10:00:00.000Z',
      items: [],
    };
    mockClaimExecute.mockResolvedValueOnce(task);

    await controller.claimNext(req as Request, res as Response);

    expect(mockClaimExecute).toHaveBeenCalledWith(
      expect.objectContaining({ operatorUserId: 'auth0|operator-id' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(task);
  });

  it('should respond with 204 when there is no manual classification to claim', async () => {
    mockClaimExecute.mockResolvedValueOnce(undefined);
    res.send = jest.fn().mockReturnThis();

    await controller.claimNext(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('should create a manual classification command from route params and authenticated operator', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await controller.classify(req as Request, res as Response);

    expect(mockExecute).toHaveBeenCalledWith(expect.any(ManualClassifyBookingCommand));
    const command = mockExecute.mock.calls[0][0];
    expect(command.bookingId).toBe('507f1f77bcf86cd799439011');
    expect(command.operatorUserId).toBe('auth0|operator-id');
    expect(command.items).toEqual([{ itemId: '507f1f77bcf86cd799439012', category: 'Furniture' }]);
  });

  it('should respond with 200 when booking is manually classified', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await controller.classify(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Booking manually classified successfully',
    });
  });

  it('should propagate handler errors', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Manual classification failed'));

    await expect(controller.classify(req as Request, res as Response)).rejects.toThrow(
      'Manual classification failed'
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should reject a booking with route params and authenticated operator', async () => {
    mockRejectExecute.mockResolvedValueOnce(undefined);

    await controller.reject(req as Request, res as Response);

    expect(mockRejectExecute).toHaveBeenCalledWith(expect.any(RejectManualClassificationCommand));
    const command = mockRejectExecute.mock.calls[0][0];
    expect(command.bookingId).toBe('507f1f77bcf86cd799439011');
    expect(command.operatorUserId).toBe('auth0|operator-id');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Booking rejected successfully' });
  });
});
