import { UpdateVehicleCommand } from '../../../../../src/application/commands/update-vehicle/update-vehicle.command';
import { UpdateVehicleHandler } from '../../../../../src/application/commands/update-vehicle/update-vehicle.handler';
import { VehicleType } from '../../../../../src/domain/enums/vehicle-type';
import type { IVehicleWriteRepository } from '../../../../../src/domain/repositories/vehicle.write.repository';

describe('UpdateVehicleHandler', () => {
  let mockWriteRepository: jest.Mocked<IVehicleWriteRepository>;
  let handler: UpdateVehicleHandler;

  beforeEach(() => {
    mockWriteRepository = { create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    handler = new UpdateVehicleHandler(mockWriteRepository);
  });

  it('should delegate to repository.update with the dto', async () => {
    mockWriteRepository.update.mockResolvedValueOnce();
    const command = new UpdateVehicleCommand(6, undefined, VehicleType.VAN, 4, true);

    await handler.execute(command);

    expect(mockWriteRepository.update).toHaveBeenCalledWith(6, {
      licensePlate: undefined,
      type: VehicleType.VAN,
      capacity: 4,
      available: true,
      deviceId: undefined,
      characteristics: undefined,
    });
  });

  it('should propagate a not-found error', async () => {
    mockWriteRepository.update.mockRejectedValueOnce(
      Object.assign(new Error('Vehicle not found'), { status: 404 })
    );

    await expect(
      handler.execute(new UpdateVehicleCommand(999, undefined, undefined, 4))
    ).rejects.toMatchObject({ status: 404 });
  });
});
