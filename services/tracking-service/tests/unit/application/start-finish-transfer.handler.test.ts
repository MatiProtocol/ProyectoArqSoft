jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { FinishTransferCommand } from '../../../src/application/commands/finish-transfer/finish-transfer.command';
import { FinishTransferHandler } from '../../../src/application/commands/finish-transfer/finish-transfer.handler';
import { StartTransferCommand } from '../../../src/application/commands/start-transfer/start-transfer.command';
import { StartTransferHandler } from '../../../src/application/commands/start-transfer/start-transfer.handler';
import type { ITransferReadRepository } from '../../../src/application/contracts/transfer.read.repository';
import type { TransferReadDto } from '../../../src/application/dtos/transfer-read.dto';
import { TransferStatus } from '../../../src/domain/enums/transfer-status';
import type { ITransferWriteRepository } from '../../../src/domain/repositories/transfer.write.repository';

function buildTransfer(overrides: Partial<TransferReadDto> = {}): TransferReadDto {
  return {
    id: 42,
    bookingId: 'b1',
    vehicleId: 1,
    deviceId: 'GPS-001',
    driverId: 'auth0|driver',
    origin: [-56.16, -34.9],
    destination: [-56.03, -34.83],
    status: TransferStatus.ASSIGNED,
    hasActiveAlerts: false,
    ...overrides,
  };
}

function setup() {
  const transferRead: jest.Mocked<ITransferReadRepository> = {
    findById: jest.fn(),
    getActive: jest.fn(),
    existsActiveForVehicle: jest.fn(),
  };
  const transferWrite: jest.Mocked<ITransferWriteRepository> = {
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateLastPosition: jest.fn(),
    markHasActiveAlerts: jest.fn(),
  };
  return { transferRead, transferWrite };
}

describe('StartTransferCommand.create', () => {
  it('parses a valid numeric transferId param', () => {
    const command = StartTransferCommand.create('42', 'auth0|driver');

    expect(command.transferId).toBe(42);
    expect(command.driverId).toBe('auth0|driver');
  });

  it('rejects a non-numeric transferId param', () => {
    expect(() => StartTransferCommand.create('abc', 'auth0|driver')).toThrow();
  });
});

describe('FinishTransferCommand.create', () => {
  it('parses a valid numeric transferId param', () => {
    const command = FinishTransferCommand.create('42', 'auth0|driver');

    expect(command.transferId).toBe(42);
    expect(command.driverId).toBe('auth0|driver');
  });

  it('rejects a non-numeric transferId param', () => {
    expect(() => FinishTransferCommand.create('abc', 'auth0|driver')).toThrow();
  });
});

describe('StartTransferHandler', () => {
  it('moves an assigned transfer to IN_PROGRESS for its driver', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(buildTransfer());
    const handler = new StartTransferHandler(transferRead, transferWrite);

    await handler.execute(new StartTransferCommand(42, 'auth0|driver'));

    expect(transferWrite.updateStatus).toHaveBeenCalledWith(
      42,
      TransferStatus.IN_PROGRESS,
      expect.objectContaining({ startedAt: expect.any(String) })
    );
  });

  it('forbids a driver not assigned to the transfer', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(buildTransfer({ driverId: 'auth0|other' }));
    const handler = new StartTransferHandler(transferRead, transferWrite);

    await expect(
      handler.execute(new StartTransferCommand(42, 'auth0|driver'))
    ).rejects.toMatchObject({ status: 403 });
    expect(transferWrite.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects starting a transfer that is not ASSIGNED', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(buildTransfer({ status: TransferStatus.IN_PROGRESS }));
    const handler = new StartTransferHandler(transferRead, transferWrite);

    await expect(
      handler.execute(new StartTransferCommand(42, 'auth0|driver'))
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects when the transfer does not exist', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(null);
    const handler = new StartTransferHandler(transferRead, transferWrite);

    await expect(
      handler.execute(new StartTransferCommand(42, 'auth0|driver'))
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('FinishTransferHandler', () => {
  it('completes an in-progress transfer for its driver', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(buildTransfer({ status: TransferStatus.IN_PROGRESS }));
    const handler = new FinishTransferHandler(transferRead, transferWrite);

    await handler.execute(new FinishTransferCommand(42, 'auth0|driver'));

    expect(transferWrite.updateStatus).toHaveBeenCalledWith(
      42,
      TransferStatus.COMPLETED,
      expect.objectContaining({ finishedAt: expect.any(String) })
    );
  });

  it('rejects when the transfer does not exist', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(null);
    const handler = new FinishTransferHandler(transferRead, transferWrite);

    await expect(
      handler.execute(new FinishTransferCommand(42, 'auth0|driver'))
    ).rejects.toMatchObject({ status: 404 });
  });

  it('forbids a driver not assigned to the transfer', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(
      buildTransfer({ status: TransferStatus.IN_PROGRESS, driverId: 'auth0|other' })
    );
    const handler = new FinishTransferHandler(transferRead, transferWrite);

    await expect(
      handler.execute(new FinishTransferCommand(42, 'auth0|driver'))
    ).rejects.toMatchObject({ status: 403 });
    expect(transferWrite.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects finishing a transfer that is not IN_PROGRESS', async () => {
    const { transferRead, transferWrite } = setup();
    transferRead.findById.mockResolvedValue(buildTransfer({ status: TransferStatus.ASSIGNED }));
    const handler = new FinishTransferHandler(transferRead, transferWrite);

    await expect(
      handler.execute(new FinishTransferCommand(42, 'auth0|driver'))
    ).rejects.toMatchObject({ status: 409 });
  });
});
