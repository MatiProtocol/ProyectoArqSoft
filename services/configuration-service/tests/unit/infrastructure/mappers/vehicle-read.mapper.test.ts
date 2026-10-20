import { VehicleType } from '../../../../src/domain/enums/vehicle-type';
import { toVehicleReadDto } from '../../../../src/infrastructure/mappers/vehicle-read.mapper';
import type { VehicleDocument } from '../../../../src/infrastructure/models/vehicle.model';

describe('toVehicleReadDto', () => {
  it('should map a vehicle document to its read DTO with a numeric id', () => {
    const doc = {
      _id: 7,
      licensePlate: 'VAN-12',
      type: VehicleType.VAN,
      capacity: 4,
      available: true,
      deviceId: 'dev-1',
      characteristics: { refrigerated: true },
    } as unknown as VehicleDocument;

    expect(toVehicleReadDto(doc)).toEqual({
      id: 7,
      licensePlate: 'VAN-12',
      type: VehicleType.VAN,
      capacity: 4,
      available: true,
      deviceId: 'dev-1',
      characteristics: { refrigerated: true },
    });
  });
});
