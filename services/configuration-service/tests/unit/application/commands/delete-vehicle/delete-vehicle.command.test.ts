import { DeleteVehicleCommand } from '../../../../../src/application/commands/delete-vehicle/delete-vehicle.command';

describe('DeleteVehicleCommand.create', () => {
  it('should build a command for a valid numeric id', () => {
    expect(DeleteVehicleCommand.create('42').id).toBe(42);
  });

  it('should throw 400 for a non-numeric id', () => {
    expect(() => DeleteVehicleCommand.create('abc')).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
