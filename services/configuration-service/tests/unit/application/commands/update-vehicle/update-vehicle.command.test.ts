import { UpdateVehicleCommand } from '../../../../../src/application/commands/update-vehicle/update-vehicle.command';
import { VehicleType } from '../../../../../src/domain/enums/vehicle-type';

describe('UpdateVehicleCommand.create', () => {
  it('should build a command with all fields and a numeric id', () => {
    const command = UpdateVehicleCommand.create('42', {
      licensePlate: 'VAN-99',
      type: 'TRUCK',
      capacity: 8,
      available: false,
      deviceId: 'dev-9',
      characteristics: { armored: true },
    });

    expect(command.id).toBe(42);
    expect(command.licensePlate).toBe('VAN-99');
    expect(command.type).toBe(VehicleType.TRUCK);
    expect(command.capacity).toBe(8);
    expect(command.available).toBe(false);
    expect(command.deviceId).toBe('dev-9');
    expect(command.characteristics).toEqual({ armored: true });
  });

  it('should allow a partial update (only available)', () => {
    const command = UpdateVehicleCommand.create('42', { available: true });
    expect(command.id).toBe(42);
    expect(command.available).toBe(true);
    expect(command.licensePlate).toBeUndefined();
  });

  it('should build a command when body is undefined', () => {
    expect(UpdateVehicleCommand.create('42', undefined).id).toBe(42);
  });

  it('should throw 400 for a non-numeric id', () => {
    expect(() => UpdateVehicleCommand.create('abc', { capacity: 4 })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 for invalid field values', () => {
    expect(() => UpdateVehicleCommand.create('42', { licensePlate: '  ' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() => UpdateVehicleCommand.create('42', { type: 'PLANE' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() => UpdateVehicleCommand.create('42', { capacity: 0 })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() => UpdateVehicleCommand.create('42', { available: 'x' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() => UpdateVehicleCommand.create('42', { deviceId: '  ' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() => UpdateVehicleCommand.create('42', { characteristics: [1] })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
