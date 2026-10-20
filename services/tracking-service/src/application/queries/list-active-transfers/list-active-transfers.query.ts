import { ErrorFactory } from '@move/errors-lib';

export class ListActiveTransfersQuery {
  constructor(
    public readonly vehicleId?: number,
    public readonly driverId?: string,
    public readonly category?: string,
    public readonly hasActiveAlerts?: boolean,
    public readonly limit?: number,
    public readonly skip?: number
  ) {}

  static fromQueryParams(params: {
    vehicleId?: unknown;
    driverId?: unknown;
    category?: unknown;
    hasActiveAlerts?: unknown;
    limit?: unknown;
    skip?: unknown;
  }): ListActiveTransfersQuery {
    return new ListActiveTransfersQuery(
      parseOptionalPositiveInt(params.vehicleId, 'vehicleId'),
      parseOptionalString(params.driverId, 'driverId'),
      parseOptionalString(params.category, 'category'),
      parseOptionalBoolean(params.hasActiveAlerts, 'hasActiveAlerts'),
      parseOptionalPositiveInt(params.limit, 'limit'),
      parseOptionalPositiveInt(params.skip, 'skip')
    );
  }
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw ErrorFactory.badRequest(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function parseOptionalPositiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw ErrorFactory.badRequest(`${field} must be a non-negative integer`);
  }
  return Number(value);
}

function parseOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw ErrorFactory.badRequest(`${field} must be 'true' or 'false'`);
}
