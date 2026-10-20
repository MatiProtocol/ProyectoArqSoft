import { ListVehiclesHandler } from '../../../../../src/application/queries/list-vehicles/list-vehicles.handler';
import { ListVehiclesQuery } from '../../../../../src/application/queries/list-vehicles/list-vehicles.query';
import { VehicleType } from '../../../../../src/domain/enums/vehicle-type';
import type { IVehicleReadRepository } from '../../../../../src/domain/repositories/vehicle.read.repository';

describe('ListVehiclesHandler', () => {
  let mockReadRepository: jest.Mocked<IVehicleReadRepository>;
  let handler: ListVehiclesHandler;

  beforeEach(() => {
    mockReadRepository = { getAll: jest.fn() };
    handler = new ListVehiclesHandler(mockReadRepository);
  });

  it('should delegate to the read repository with the filter', async () => {
    const vehicles = [
      { id: 1, licensePlate: 'VAN-12', type: VehicleType.VAN, capacity: 4, available: true },
    ];
    mockReadRepository.getAll.mockResolvedValueOnce(vehicles);

    const result = await handler.execute(
      new ListVehiclesQuery(true, VehicleType.VAN, 'dev-1', 10, 0)
    );

    expect(mockReadRepository.getAll).toHaveBeenCalledWith({
      available: true,
      type: VehicleType.VAN,
      deviceId: 'dev-1',
      limit: 10,
      skip: 0,
    });
    expect(result).toBe(vehicles);
  });
});
