import type { Request, Response } from 'express';
import type { AssignTransferHandler } from '../../../../src/application/commands/assign-transfer/assign-transfer.handler';
import type { FinishTransferHandler } from '../../../../src/application/commands/finish-transfer/finish-transfer.handler';
import type { StartTransferHandler } from '../../../../src/application/commands/start-transfer/start-transfer.handler';
import type { GetTransferPositionsHandler } from '../../../../src/application/queries/get-transfer-positions/get-transfer-positions.handler';
import type { ListActiveTransfersHandler } from '../../../../src/application/queries/list-active-transfers/list-active-transfers.handler';
import { TransferController } from '../../../../src/presentation/controllers/transfer.controller';

describe('TransferController', () => {
  let assignHandler: jest.Mocked<AssignTransferHandler>;
  let startHandler: jest.Mocked<StartTransferHandler>;
  let finishHandler: jest.Mocked<FinishTransferHandler>;
  let listActiveHandler: jest.Mocked<ListActiveTransfersHandler>;
  let getPositionsHandler: jest.Mocked<GetTransferPositionsHandler>;
  let controller: TransferController;
  let res: Partial<Response>;

  beforeEach(() => {
    assignHandler = { execute: jest.fn() } as unknown as jest.Mocked<AssignTransferHandler>;
    startHandler = { execute: jest.fn() } as unknown as jest.Mocked<StartTransferHandler>;
    finishHandler = { execute: jest.fn() } as unknown as jest.Mocked<FinishTransferHandler>;
    listActiveHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListActiveTransfersHandler>;
    getPositionsHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTransferPositionsHandler>;

    controller = new TransferController(
      assignHandler,
      startHandler,
      finishHandler,
      listActiveHandler,
      getPositionsHandler
    );

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('assign', () => {
    it('creates the transfer and responds with 201', async () => {
      assignHandler.execute.mockResolvedValueOnce(42);
      const req = {
        body: { bookingId: 'b1', vehicleId: 1, driverId: 'auth0|driver' },
      } as unknown as Request;

      await controller.assign(req, res as Response);

      expect(assignHandler.execute).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 42,
        message: 'Transfer assigned successfully',
      });
    });
  });

  describe('start', () => {
    it('starts the transfer using the authenticated user id and responds with 200', async () => {
      startHandler.execute.mockResolvedValueOnce(undefined);
      const req = {
        params: { id: '42' },
        user: { id: 'auth0|driver', roles: [] },
      } as unknown as Request;

      await controller.start(req, res as Response);

      const command = startHandler.execute.mock.calls[0][0];
      expect(command.transferId).toBe(42);
      expect(command.driverId).toBe('auth0|driver');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transfer started successfully' });
    });
  });

  describe('finish', () => {
    it('finishes the transfer using the authenticated user id and responds with 200', async () => {
      finishHandler.execute.mockResolvedValueOnce(undefined);
      const req = {
        params: { id: '42' },
        user: { id: 'auth0|driver', roles: [] },
      } as unknown as Request;

      await controller.finish(req, res as Response);

      const command = finishHandler.execute.mock.calls[0][0];
      expect(command.transferId).toBe(42);
      expect(command.driverId).toBe('auth0|driver');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transfer finished successfully' });
    });
  });

  describe('listActive', () => {
    it('lists active transfers parsed from the query params', async () => {
      listActiveHandler.execute.mockResolvedValueOnce([]);
      const req = { query: { vehicleId: '1' } } as unknown as Request;

      await controller.listActive(req, res as Response);

      const query = listActiveHandler.execute.mock.calls[0][0];
      expect(query.vehicleId).toBe(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getPositions', () => {
    it('returns recent positions for the transfer', async () => {
      getPositionsHandler.execute.mockResolvedValueOnce([]);
      const req = { params: { id: '42' }, query: {} } as unknown as Request;

      await controller.getPositions(req, res as Response);

      const query = getPositionsHandler.execute.mock.calls[0][0];
      expect(query.transferId).toBe(42);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
