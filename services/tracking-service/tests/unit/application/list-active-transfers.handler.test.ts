import type { ITransferReadRepository } from '../../../src/application/contracts/transfer.read.repository';
import { ListActiveTransfersHandler } from '../../../src/application/queries/list-active-transfers/list-active-transfers.handler';
import { ListActiveTransfersQuery } from '../../../src/application/queries/list-active-transfers/list-active-transfers.query';
import { TransferStatus } from '../../../src/domain/enums/transfer-status';

describe('ListActiveTransfersHandler', () => {
  it('delegates to the read repository with the query filters', async () => {
    const transferRead: jest.Mocked<ITransferReadRepository> = {
      findById: jest.fn(),
      getActive: jest.fn().mockResolvedValue([
        {
          id: 42,
          bookingId: 'b1',
          vehicleId: 1,
          deviceId: 'GPS-001',
          driverId: 'auth0|driver',
          origin: [-56.16, -34.9],
          destination: [-56.03, -34.83],
          status: TransferStatus.IN_PROGRESS,
          hasActiveAlerts: false,
        },
      ]),
      existsActiveForVehicle: jest.fn(),
    };
    const handler = new ListActiveTransfersHandler(transferRead);
    const query = new ListActiveTransfersQuery(1, 'auth0|driver', 'electronics', true, 10, 5);

    const result = await handler.execute(query);

    expect(transferRead.getActive).toHaveBeenCalledWith({
      vehicleId: 1,
      driverId: 'auth0|driver',
      category: 'electronics',
      hasActiveAlerts: true,
      limit: 10,
      skip: 5,
    });
    expect(result).toHaveLength(1);
  });
});
