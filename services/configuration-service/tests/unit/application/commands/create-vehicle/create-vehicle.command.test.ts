import { CreateVehicleCommand } from '../../../../../src/application/commands/create-vehicle/create-vehicle.command';
import { VehicleType } from '../../../../../src/domain/enums/vehicle-type';

describe('CreateVehicleCommand.create', () => {
  it('should build a command from a valid body', () => {
    const command = CreateVehicleCommand.create({
      licensePlate: 'VAN-12',
      type: 'VAN',
      capacity: 4,
      deviceId: 'dev-1',
      characteristics: { refrigerated: true },
      available: false,
    });

    expect(command).toBeInstanceOf(CreateVehicleCommand);
    expect(command.licensePlate).toBe('VAN-12');
    expect(command.type).toBe(VehicleType.VAN);
    expect(command.capacity).toBe(4);
    expect(command.deviceId).toBe('dev-1');
    expect(command.characteristics).toEqual({ refrigerated: true });
    expect(command.available).toBe(false);
  });

  it('should build a command with only the required fields', () => {
    const command = CreateVehicleCommand.create({
      licensePlate: 'AUTO-5',
      type: 'CAR',
      capacity: 1,
    });
    expect(command.deviceId).toBeUndefined();
    expect(command.characteristics).toBeUndefined();
    expect(command.available).toBeUndefined();
  });

  it('should throw 400 if licensePlate is missing or empty', () => {
    expect(() => CreateVehicleCommand.create({ type: 'VAN', capacity: 4 })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() =>
      CreateVehicleCommand.create({ licensePlate: '  ', type: 'VAN', capacity: 4 })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if type is invalid', () => {
    expect(() =>
      CreateVehicleCommand.create({ licensePlate: 'X', type: 'PLANE', capacity: 4 })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if capacity is not a positive integer', () => {
    expect(() =>
      CreateVehicleCommand.create({ licensePlate: 'X', type: 'VAN', capacity: 0 })
    ).toThrow(expect.objectContaining({ status: 400 }));
    expect(() =>
      CreateVehicleCommand.create({ licensePlate: 'X', type: 'VAN', capacity: 1.5 })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if deviceId is an empty string', () => {
    expect(() =>
      CreateVehicleCommand.create({ licensePlate: 'X', type: 'VAN', capacity: 4, deviceId: '  ' })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if characteristics is not an object', () => {
    expect(() =>
      CreateVehicleCommand.create({
        licensePlate: 'X',
        type: 'VAN',
        capacity: 4,
        characteristics: [1, 2],
      })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if available is not a boolean', () => {
    expect(() =>
      CreateVehicleCommand.create({ licensePlate: 'X', type: 'VAN', capacity: 4, available: 'yes' })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if body is undefined', () => {
    expect(() => CreateVehicleCommand.create(undefined)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
