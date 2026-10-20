import type { Request, Response } from 'express';
import { IngestGpsReadingCommand } from '../../../../src/application/commands/ingest-gps-reading/ingest-gps-reading.command';
import type { IngestGpsReadingHandler } from '../../../../src/application/commands/ingest-gps-reading/ingest-gps-reading.handler';
import { GpsController } from '../../../../src/presentation/controllers/gps.controller';

const mockExecute = jest.fn();
const mockHandler = {
  execute: mockExecute,
} as unknown as jest.Mocked<IngestGpsReadingHandler>;

describe('GpsController', () => {
  let controller: GpsController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new GpsController(mockHandler);
    req = {
      body: {
        transferId: 7,
        vehicleId: 1,
        deviceId: 'GPS-001',
        coordinates: [-56.16, -34.9],
        timestamp: '2026-06-23T10:00:00.000Z',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('builds an IngestGpsReadingCommand from the request body', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await controller.ingest(req as Request, res as Response);

    expect(mockExecute).toHaveBeenCalledWith(expect.any(IngestGpsReadingCommand));
    const command = mockExecute.mock.calls[0][0];
    expect(command.transferId).toBe(7);
    expect(command.deviceId).toBe('GPS-001');
  });

  it('responds with 202 when the reading is accepted', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    await controller.ingest(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ message: 'GPS reading accepted' });
  });

  it('propagates handler errors', async () => {
    const error = new Error('publish failed');
    mockExecute.mockRejectedValueOnce(error);

    await expect(controller.ingest(req as Request, res as Response)).rejects.toThrow(
      'publish failed'
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});
