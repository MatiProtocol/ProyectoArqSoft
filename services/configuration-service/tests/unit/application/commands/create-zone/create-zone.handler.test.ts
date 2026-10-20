import { CreateZoneCommand } from '../../../../../src/application/commands/create-zone/create-zone.command';
import { CreateZoneHandler } from '../../../../../src/application/commands/create-zone/create-zone.handler';
import { Zone } from '../../../../../src/domain/entities/zone';
import { ZoneType } from '../../../../../src/domain/enums/zone-type';
import type { IZoneWriteRepository } from '../../../../../src/domain/repositories/zone.write.repository';

const ring: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

describe('CreateZoneHandler', () => {
  let mockWriteRepository: jest.Mocked<IZoneWriteRepository>;
  let handler: CreateZoneHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    handler = new CreateZoneHandler(mockWriteRepository);
  });

  it('should build a Zone and return the created numeric id', async () => {
    mockWriteRepository.create.mockResolvedValueOnce(271);
    const command = new CreateZoneCommand('Centro', ZoneType.RED_ZONE, ring);

    const id = await handler.execute(command);

    expect(id).toBe(271);
    const passedZone = mockWriteRepository.create.mock.calls[0][0];
    expect(passedZone).toBeInstanceOf(Zone);
    expect(passedZone.name).toBe('Centro');
    expect(passedZone.type).toBe(ZoneType.RED_ZONE);
    expect(passedZone.coordinates).toEqual(ring);
  });

  it('should propagate repository errors', async () => {
    mockWriteRepository.create.mockRejectedValueOnce(new Error('db down'));
    const command = new CreateZoneCommand('Centro', ZoneType.RED_ZONE, ring);

    await expect(handler.execute(command)).rejects.toThrow('db down');
  });
});
