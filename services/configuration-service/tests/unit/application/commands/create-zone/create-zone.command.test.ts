import { CreateZoneCommand } from '../../../../../src/application/commands/create-zone/create-zone.command';
import { ZoneType } from '../../../../../src/domain/enums/zone-type';

const ring = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

describe('CreateZoneCommand.create', () => {
  it('should build a command from a valid body with flat coordinates', () => {
    const command = CreateZoneCommand.create({
      name: 'Centro',
      type: 'RED_ZONE',
      coordinates: ring,
    });

    expect(command).toBeInstanceOf(CreateZoneCommand);
    expect(command.name).toBe('Centro');
    expect(command.type).toBe(ZoneType.RED_ZONE);
    expect(command.coordinates).toEqual(ring);
  });

  it('should throw 400 if name is missing or empty', () => {
    expect(() => CreateZoneCommand.create({ type: 'RED_ZONE', coordinates: ring })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(() =>
      CreateZoneCommand.create({ name: '  ', type: 'RED_ZONE', coordinates: ring })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if type is invalid', () => {
    expect(() =>
      CreateZoneCommand.create({ name: 'Centro', type: 'PURPLE', coordinates: ring })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if coordinates are invalid', () => {
    expect(() =>
      CreateZoneCommand.create({ name: 'Centro', type: 'RED_ZONE', coordinates: [[0, 0]] })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('should throw 400 if body is undefined', () => {
    expect(() => CreateZoneCommand.create(undefined)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
