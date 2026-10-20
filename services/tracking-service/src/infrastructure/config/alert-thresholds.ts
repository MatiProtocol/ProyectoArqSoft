import type { ProlongedStopThresholds } from '../../application/commands/detect-situations/detect-situations.handler';

const DEFAULT_RADIUS_METERS = 30;
const DEFAULT_WINDOW_MS = 120000;
const DEFAULT_MIN_READINGS = 5;

export function getProlongedStopThresholds(
  env: NodeJS.ProcessEnv = process.env
): ProlongedStopThresholds {
  return {
    radiusMeters: parsePositiveNumber(env.PROLONGED_STOP_RADIUS_METERS, DEFAULT_RADIUS_METERS),
    windowMs: parsePositiveNumber(env.PROLONGED_STOP_WINDOW_MS, DEFAULT_WINDOW_MS),
    minReadings: parsePositiveNumber(env.PROLONGED_STOP_MIN_READINGS, DEFAULT_MIN_READINGS),
  };
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}
