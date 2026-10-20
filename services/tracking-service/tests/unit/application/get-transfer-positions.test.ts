import type { IGpsReadingReadRepository } from '../../../src/application/contracts/gps-reading.read.repository';
import { GetTransferPositionsHandler } from '../../../src/application/queries/get-transfer-positions/get-transfer-positions.handler';
import { GetTransferPositionsQuery } from '../../../src/application/queries/get-transfer-positions/get-transfer-positions.query';

describe('GetTransferPositionsQuery.create', () => {
  it('parses a valid transferId and uses the default limit when omitted', () => {
    const query = GetTransferPositionsQuery.create('42', {});

    expect(query.transferId).toBe(42);
    expect(query.limit).toBe(50);
  });

  it('parses a valid limit', () => {
    const query = GetTransferPositionsQuery.create('42', { limit: '10' });

    expect(query.limit).toBe(10);
  });

  it('caps the limit at the maximum', () => {
    const query = GetTransferPositionsQuery.create('42', { limit: '1000' });

    expect(query.limit).toBe(500);
  });

  it('rejects an invalid transferId', () => {
    expect(() => GetTransferPositionsQuery.create('abc', {})).toThrow();
  });

  it('rejects a non-numeric limit', () => {
    expect(() => GetTransferPositionsQuery.create('42', { limit: 'abc' })).toThrow(
      'limit must be a non-negative integer'
    );
  });

  it('rejects a non-string limit', () => {
    expect(() =>
      GetTransferPositionsQuery.create('42', { limit: 10 as unknown as string })
    ).toThrow('limit must be a non-negative integer');
  });
});

describe('GetTransferPositionsHandler', () => {
  it('returns recent positions from the read repository', async () => {
    const gpsReadingRead: jest.Mocked<IGpsReadingReadRepository> = {
      getRecentByTransfer: jest
        .fn()
        .mockResolvedValue([
          { coordinates: [-56.16, -34.9], timestamp: '2026-06-23T10:00:00.000Z' },
        ]),
    };
    const handler = new GetTransferPositionsHandler(gpsReadingRead);

    const result = await handler.execute(new GetTransferPositionsQuery(42, 50));

    expect(gpsReadingRead.getRecentByTransfer).toHaveBeenCalledWith(42, 50);
    expect(result).toEqual([
      { coordinates: [-56.16, -34.9], timestamp: '2026-06-23T10:00:00.000Z' },
    ]);
  });
});
