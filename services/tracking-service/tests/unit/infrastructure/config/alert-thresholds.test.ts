import { getProlongedStopThresholds } from '../../../../src/infrastructure/config/alert-thresholds';

describe('getProlongedStopThresholds', () => {
  it('should use process.env by default', () => {
    const previous = process.env.PROLONGED_STOP_RADIUS_METERS;
    process.env.PROLONGED_STOP_RADIUS_METERS = '40';

    const thresholds = getProlongedStopThresholds();

    expect(thresholds.radiusMeters).toBe(40);

    process.env.PROLONGED_STOP_RADIUS_METERS = previous;
  });

  it('should parse thresholds from environment variables', () => {
    const thresholds = getProlongedStopThresholds({
      PROLONGED_STOP_RADIUS_METERS: '50',
      PROLONGED_STOP_WINDOW_MS: '60000',
      PROLONGED_STOP_MIN_READINGS: '3',
    });

    expect(thresholds).toEqual({
      radiusMeters: 50,
      windowMs: 60000,
      minReadings: 3,
    });
  });

  it('should use defaults when environment variables are missing', () => {
    const thresholds = getProlongedStopThresholds({});

    expect(thresholds).toEqual({
      radiusMeters: 30,
      windowMs: 120000,
      minReadings: 5,
    });
  });

  it('should use defaults when environment variables are blank', () => {
    const thresholds = getProlongedStopThresholds({
      PROLONGED_STOP_RADIUS_METERS: '   ',
    });

    expect(thresholds.radiusMeters).toBe(30);
  });

  it('should use defaults when values are not finite numbers', () => {
    const thresholds = getProlongedStopThresholds({
      PROLONGED_STOP_RADIUS_METERS: 'abc',
    });

    expect(thresholds.radiusMeters).toBe(30);
  });

  it('should use defaults when values are not positive', () => {
    const thresholds = getProlongedStopThresholds({
      PROLONGED_STOP_RADIUS_METERS: '0',
      PROLONGED_STOP_WINDOW_MS: '-5',
    });

    expect(thresholds.radiusMeters).toBe(30);
    expect(thresholds.windowMs).toBe(120000);
  });
});
