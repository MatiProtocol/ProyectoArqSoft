import { CreateVehicleCommand } from '../../../../../src/application/commands/create-vehicle/create-vehicle.command';
import { CreateVehicleHandler } from '../../../../../src/application/commands/create-vehicle/create-vehicle.handler';
import { Vehicle } from '../../../../../src/domain/entities/vehicle';
import { VehicleType } from '../../../../../src/domain/enums/vehicle-type';
import type { IVehicleWriteRepository } from '../../../../../src/domain/repositories/vehicle.write.repository';

describe('CreateVehicleHandler', () => {
  let mockWriteRepository: jest.Mocked<IVehicleWriteRepository>;
  let handler: CreateVehicleHandler;

  beforeEach(() => {
    mockWriteRepository = { create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    handler = new CreateVehicleHandler(mockWriteRepository);
  });

  it('should default available to true and return the created numeric id', async () => {
    mockWriteRepository.create.mockResolvedValueOnce(1);
    const command = new CreateVehicleCommand('VAN-12', VehicleType.VAN, 4);

    const id = await handler.execute(command);

    expect(id).toBe(1);
    const passedVehicle = mockWriteRepository.create.mock.calls[0][0];
    expect(passedVehicle).toBeInstanceOf(Vehicle);
    expect(passedVehicle.available).toBe(true);
  });

  it('should respect available=false when provided', async () => {
    mockWriteRepository.create.mockResolvedValueOnce(2);
    const command = new CreateVehicleCommand(
      'VAN-13',
      VehicleType.VAN,
      4,
      undefined,
      undefined,
      false
    );

    await handler.execute(command);

    const passedVehicle = mockWriteRepository.create.mock.calls[0][0];
    expect(passedVehicle.available).toBe(false);
  });

  it('should propagate a conflict error from the repository', async () => {
    mockWriteRepository.create.mockRejectedValueOnce(
      Object.assign(new Error('conflict'), { status: 409 })
    );

    await expect(
      handler.execute(new CreateVehicleCommand('VAN-12', VehicleType.VAN, 4))
    ).rejects.toMatchObject({ status: 409 });
  });
});
