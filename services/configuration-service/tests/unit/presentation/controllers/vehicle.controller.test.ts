import type { Request, Response } from 'express';
import { CreateVehicleCommand } from '../../../../src/application/commands/create-vehicle/create-vehicle.command';
import type { CreateVehicleHandler } from '../../../../src/application/commands/create-vehicle/create-vehicle.handler';
import type { DeleteVehicleHandler } from '../../../../src/application/commands/delete-vehicle/delete-vehicle.handler';
import type { UpdateVehicleHandler } from '../../../../src/application/commands/update-vehicle/update-vehicle.handler';
import type { ListVehiclesHandler } from '../../../../src/application/queries/list-vehicles/list-vehicles.handler';
import { VehicleController } from '../../../../src/presentation/controllers/vehicle.controller';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockList = jest.fn();

describe('VehicleController', () => {
  let controller: VehicleController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new VehicleController(
      { execute: mockCreate } as unknown as jest.Mocked<CreateVehicleHandler>,
      { execute: mockUpdate } as unknown as jest.Mocked<UpdateVehicleHandler>,
      { execute: mockDelete } as unknown as jest.Mocked<DeleteVehicleHandler>,
      { execute: mockList } as unknown as jest.Mocked<ListVehiclesHandler>
    );
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a vehicle and return 201 with the numeric id', async () => {
      req.body = { licensePlate: 'VAN-12', type: 'VAN', capacity: 4 };
      mockCreate.mockResolvedValueOnce(1);

      await controller.create(req as Request, res as Response);

      expect(mockCreate).toHaveBeenCalledWith(expect.any(CreateVehicleCommand));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, message: 'Vehicle created successfully' });
    });

    it('should propagate validation errors without calling the handler', async () => {
      req.body = { type: 'VAN', capacity: 4 };

      await expect(controller.create(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return 200', async () => {
      req.params = { id: '42' };
      req.body = { available: false };
      mockUpdate.mockResolvedValueOnce(undefined);

      await controller.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vehicle updated successfully' });
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
      expect(res.json).toHaveBeenCalledWith({ message: 'Vehicle deleted successfully' });
    });
  });

  describe('list', () => {
    it('should return the vehicles with 200', async () => {
      req.query = { available: 'true' };
      const vehicles = [{ id: 1 }];
      mockList.mockResolvedValueOnce(vehicles);

      await controller.list(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(vehicles);
    });

    it('should propagate invalid filter errors', async () => {
      req.query = { available: 'maybe' };

      await expect(controller.list(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockList).not.toHaveBeenCalled();
    });
  });
});
