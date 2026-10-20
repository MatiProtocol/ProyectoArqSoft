import { DeleteZoneCommand } from '../../../../../src/application/commands/delete-zone/delete-zone.command';
import { DeleteZoneHandler } from '../../../../../src/application/commands/delete-zone/delete-zone.handler';
import type { IZoneWriteRepository } from '../../../../../src/domain/repositories/zone.write.repository';

describe('DeleteZoneHandler', () => {
  let mockWriteRepository: jest.Mocked<IZoneWriteRepository>;
  let handler: DeleteZoneHandler;

  beforeEach(() => {
    mockWriteRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    handler = new DeleteZoneHandler(mockWriteRepository);
  });

  it('should delegate to repository.delete with the numeric id', async () => {
    mockWriteRepository.delete.mockResolvedValueOnce();

    await handler.execute(new DeleteZoneCommand(6));

    expect(mockWriteRepository.delete).toHaveBeenCalledWith(6);
  });

  it('should propagate a not-found error', async () => {
    mockWriteRepository.delete.mockRejectedValueOnce(
      Object.assign(new Error('Zone not found'), { status: 404 })
    );

    await expect(handler.execute(new DeleteZoneCommand(999))).rejects.toMatchObject({
      status: 404,
    });
  });
});
