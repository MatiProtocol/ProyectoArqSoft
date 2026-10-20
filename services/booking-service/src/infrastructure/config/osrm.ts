export type OsrmConfig = {
  baseUrl: string;
  timeoutMs: number;
  baseRatePerKm: number;
  surchargePercentPerRule: number;
};

export function getOsrmConfig(env: NodeJS.ProcessEnv = process.env): OsrmConfig {
  return {
    baseUrl: (env['OSRM_URL'] ?? 'http://router.project-osrm.org').replace(/\/+$/, ''),
    timeoutMs: parsePositiveInt(env['OSRM_TIMEOUT_MS'], 200),
    baseRatePerKm: parsePositiveFloat(env['BASE_RATE_PER_KM'], 5.0),
    surchargePercentPerRule: parsePositiveFloat(env['SURCHARGE_PERCENT_PER_RULE'], 20),
  };
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function parsePositiveFloat(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}
