import { Alert } from '../../../../../src/domain/entities/alert';
import { AlertSeverity } from '../../../../../src/domain/enums/alert-severity';
import { AlertType } from '../../../../../src/domain/enums/alert-type';
import { AlertModel } from '../../../../../src/infrastructure/models/alert.model';
import { AlertWriteRepository } from '../../../../../src/infrastructure/repositories/implementations/alert.write.repository';

var mockSave: jest.Mock;

jest.mock('../../../../../src/infrastructure/models/alert.model', () => {
  mockSave = jest.fn();

  return {
    AlertModel: jest.fn().mockImplementation(function (
      this: { data?: unknown; save?: jest.Mock },
      data: unknown
    ) {
      this.data = data;
      this.save = mockSave;
      return this;
    }),
  };
});

describe('AlertWriteRepository', () => {
  let repository: AlertWriteRepository;

  beforeEach(() => {
    repository = new AlertWriteRepository();
    jest.clearAllMocks();
  });

  function buildAlert(): Alert {
    return new Alert(
      '507f1f77bcf86cd799439011',
      42,
      1,
      AlertType.RED_ZONE_ENTRY,
      AlertSeverity.CRITICAL,
      "Vehicle entered red zone 'Centro'",
      '507f1f77bcf86cd799439012',
      7,
      '2026-06-23T10:00:00.000Z'
    );
  }

  it('should create an alert document', async () => {
    const alert = buildAlert();
    mockSave.mockResolvedValueOnce(undefined);

    await repository.create(alert);

    expect(AlertModel).toHaveBeenCalledWith({
      _id: alert.id,
      transferId: alert.transferId,
      vehicleId: alert.vehicleId,
      type: alert.type,
      severity: alert.severity,
      description: alert.description,
      gpsReadingId: alert.gpsReadingId,
      zoneId: alert.zoneId,
      occurredAt: new Date(alert.occurredAt),
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should throw alert already exists when save fails with duplicate key code 11000', async () => {
    const duplicateError = Object.assign(new Error('Duplicate key error'), { code: 11000 });
    mockSave.mockRejectedValueOnce(duplicateError);

    await expect(repository.create(buildAlert())).rejects.toMatchObject({
      message: 'Alert already exists.',
      status: 409,
    });
  });

  it('should propagate non-duplicate errors thrown by save', async () => {
    const dbError = new Error('Mongoose validation failed');
    mockSave.mockRejectedValueOnce(dbError);

    await expect(repository.create(buildAlert())).rejects.toThrow('Mongoose validation failed');
  });

  it('should propagate non-Error rejections from save', async () => {
    mockSave.mockRejectedValueOnce('a plain string rejection');

    await expect(repository.create(buildAlert())).rejects.toBe('a plain string rejection');
  });
});
