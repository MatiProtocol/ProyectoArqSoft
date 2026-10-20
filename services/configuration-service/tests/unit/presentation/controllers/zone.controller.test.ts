import type { Request, Response } from 'express';
import { CreateZoneCommand } from '../../../../src/application/commands/create-zone/create-zone.command';
import type { CreateZoneHandler } from '../../../../src/application/commands/create-zone/create-zone.handler';
import type { DeleteZoneHandler } from '../../../../src/application/commands/delete-zone/delete-zone.handler';
import type { UpdateZoneHandler } from '../../../../src/application/commands/update-zone/update-zone.handler';
import type { ListZonesHandler } from '../../../../src/application/queries/list-zones/list-zones.handler';
import { ZoneController } from '../../../../src/presentation/controllers/zone.controller';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockList = jest.fn();

const ring = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

describe('ZoneController', () => {
  let controller: ZoneController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new ZoneController(
      { execute: mockCreate } as unknown as jest.Mocked<CreateZoneHandler>,
      { execute: mockUpdate } as unknown as jest.Mocked<UpdateZoneHandler>,
      { execute: mockDelete } as unknown as jest.Mocked<DeleteZoneHandler>,
      { execute: mockList } as unknown as jest.Mocked<ListZonesHandler>
    );
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a zone and return 201 with the numeric id', async () => {
      req.body = { name: 'Centro', type: 'RED_ZONE', coordinates: ring };
      mockCreate.mockResolvedValueOnce(1);

      await controller.create(req as Request, res as Response);

      expect(mockCreate).toHaveBeenCalledWith(expect.any(CreateZoneCommand));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, message: 'Zone created successfully' });
    });

    it('should propagate validation errors without calling the handler', async () => {
      req.body = { type: 'RED_ZONE', coordinates: ring };

      await expect(controller.create(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return 200', async () => {
      req.params = { id: '42' };
      req.body = { name: 'Nueva' };
      mockUpdate.mockResolvedValueOnce(undefined);

      await controller.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Zone updated successfully' });
    });

    it('should propagate invalid-id error', async () => {
      req.params = { id: 'abc' };

      await expect(controller.update(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return 200', async () => {
      req.params = { id: '42' };
      mockDelete.mockResolvedValueOnce(undefined);

      await controller.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Zone deleted successfully' });
    });
  });

  describe('list', () => {
    it('should return the zones with 200', async () => {
      req.query = { type: 'RED_ZONE' };
      const zones = [{ id: 1 }];
      mockList.mockResolvedValueOnce(zones);

      await controller.list(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(zones);
    });

    it('should propagate invalid filter errors', async () => {
      req.query = { type: 'NOPE' };

      await expect(controller.list(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockList).not.toHaveBeenCalled();
    });
  });
});
