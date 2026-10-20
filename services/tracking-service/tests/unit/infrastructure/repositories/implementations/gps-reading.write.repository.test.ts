import { GpsReading } from '../../../../../src/domain/entities/gps-reading';
import { GpsReadingModel } from '../../../../../src/infrastructure/models/gps-reading.model';
import { GpsReadingWriteRepository } from '../../../../../src/infrastructure/repositories/implementations/gps-reading.write.repository';

var mockSave: jest.Mock;

jest.mock('../../../../../src/infrastructure/models/gps-reading.model', () => {
  mockSave = jest.fn();

  return {
    GpsReadingModel: jest.fn().mockImplementation(function (
      this: { data?: unknown; save?: jest.Mock },
      data: unknown
    ) {
      this.data = data;
      this.save = mockSave;
      return this;
    }),
  };
});

describe('GpsReadingWriteRepository', () => {
  let repository: GpsReadingWriteRepository;

  beforeEach(() => {
    repository = new GpsReadingWriteRepository();
    jest.clearAllMocks();
  });

  it('should create a GPS reading document', async () => {
    const reading = new GpsReading(
      '507f1f77bcf86cd799439011',
      7,
      1,
      'GPS-001',
      [-56.16, -34.9],
      '2026-06-23T10:00:00.000Z'
    );
    mockSave.mockResolvedValueOnce(undefined);

    await repository.create(reading);

    expect(GpsReadingModel).toHaveBeenCalledWith({
      _id: reading.id,
      transferId: reading.transferId,
      vehicleId: reading.vehicleId,
      deviceId: reading.deviceId,
      location: { type: 'Point', coordinates: reading.coordinates },
      timestamp: new Date(reading.timestamp),
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors thrown by save', async () => {
    const reading = new GpsReading(
      '507f1f77bcf86cd799439011',
      7,
      1,
      'GPS-001',
      [-56.16, -34.9],
      '2026-06-23T10:00:00.000Z'
    );
    mockSave.mockRejectedValueOnce(new Error('Mongoose validation failed'));

    await expect(repository.create(reading)).rejects.toThrow('Mongoose validation failed');
  });
});
