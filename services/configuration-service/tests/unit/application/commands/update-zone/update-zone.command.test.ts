import { UpdateZoneCommand } from '../../../../../src/application/commands/update-zone/update-zone.command';
import { ZoneType } from '../../../../../src/domain/enums/zone-type';

const ring = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

describe('UpdateZoneCommand.create', () => {
  it('should build a command with all fields and a numeric id', () => {
    const command = UpdateZoneCommand.create('42', {
      name: 'Nueva',
      type: 'PREFERRED_ZONE',
      coordinates: ring,
    });

    expect(command.id).toBe(42);
    expect(command.name).toBe('Nueva');
    expect(command.type).toBe(ZoneType.PREFERRED_ZONE);
    expect(command.coordinates).toEqual(ring);
  });

  it('should allow a partial update (only name)', () => {
    const command = UpdateZoneCommand.create('42', { name: 'Solo nombre' });

    expect(command.name).toBe('Solo nombre');
    expect(command.type).toBeUndefined();
    expect(command.coordinates).toBeUndefined();
  });

  it('should build a command when body is undefined', () => {
    expect(UpdateZoneCommand.create('42', undefined).id).toBe(42);
  });

  it('should throw 400 for a non-numeric id', () => {
    expect(() => UpdateZoneCommand.create('abc', { name: 'x' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 if name is empty', () => {
    expect(() => UpdateZoneCommand.create('42', { name: '   ' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 if type is invalid', () => {
    expect(() => UpdateZoneCommand.create('42', { type: 'NOPE' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 if coordinates are invalid', () => {
    expect(() => UpdateZoneCommand.create('42', { coordinates: [[0, 0]] })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
