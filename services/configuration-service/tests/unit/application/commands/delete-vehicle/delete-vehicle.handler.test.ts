import { DeleteVehicleCommand } from '../../../../../src/application/commands/delete-vehicle/delete-vehicle.command';
import { DeleteVehicleHandler } from '../../../../../src/application/commands/delete-vehicle/delete-vehicle.handler';
import type { IVehicleWriteRepository } from '../../../../../src/domain/repositories/vehicle.write.repository';

describe('DeleteVehicleHandler', () => {
  let mockWriteRepository: jest.Mocked<IVehicleWriteRepository>;
  let handler: DeleteVehicleHandler;

  beforeEach(() => {
    mockWriteRepository = { create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    handler = new DeleteVehicleHandler(mockWriteRepository);
  });

  it('should delegate to repository.delete with the numeric id', async () => {
    mockWriteRepository.delete.mockResolvedValueOnce();

    await handler.execute(new DeleteVehicleCommand(6));

    expect(mockWriteRepository.delete).toHaveBeenCalledWith(6);
  });

  it('should propagate a not-found error', async () => {
    mockWriteRepository.delete.mockRejectedValueOnce(
      Object.assign(new Error('Vehicle not found'), { status: 404 })
    );

    await expect(handler.execute(new DeleteVehicleCommand(999))).rejects.toMatchObject({
      status: 404,
    });
  });
});
