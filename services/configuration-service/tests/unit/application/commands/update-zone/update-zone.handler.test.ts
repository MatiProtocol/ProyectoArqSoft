import { UpdateZoneCommand } from '../../../../../src/application/commands/update-zone/update-zone.command';
import { UpdateZoneHandler } from '../../../../../src/application/commands/update-zone/update-zone.handler';
import { ZoneType } from '../../../../../src/domain/enums/zone-type';
import type { IZoneWriteRepository } from '../../../../../src/domain/repositories/zone.write.repository';

describe('UpdateZoneHandler', () => {
  let mockWriteRepository: jest.Mocked<IZoneWriteRepository>;
  let handler: UpdateZoneHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    handler = new UpdateZoneHandler(mockWriteRepository);
  });

  it('should delegate to repository.update with the dto', async () => {
    mockWriteRepository.update.mockResolvedValueOnce();
    const command = new UpdateZoneCommand(42, 'Nueva', ZoneType.RED_ZONE, undefined);

    await handler.execute(command);

    expect(mockWriteRepository.update).toHaveBeenCalledWith(42, {
      name: 'Nueva',
      type: ZoneType.RED_ZONE,
      coordinates: undefined,
    });
  });

  it('should propagate a not-found error', async () => {
    mockWriteRepository.update.mockRejectedValueOnce(
      Object.assign(new Error('Zone not found'), { status: 404 })
    );

    await expect(handler.execute(new UpdateZoneCommand(999, 'x'))).rejects.toMatchObject({
      status: 404,
    });
  });
});
