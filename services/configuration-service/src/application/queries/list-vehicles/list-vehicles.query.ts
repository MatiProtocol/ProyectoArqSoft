import { ErrorFactory } from '@move/errors-lib';
import { VehicleType } from '../../../domain/enums/vehicle-type';

export class ListVehiclesQuery {
  constructor(
    public readonly available?: boolean,
    public readonly type?: VehicleType,
    public readonly deviceId?: string,
    public readonly limit?: number,
    public readonly skip?: number
  ) {}

  static fromQueryParams(params: {
    available?: unknown;
    type?: unknown;
    deviceId?: unknown;
    limit?: unknown;
    skip?: unknown;
  }): ListVehiclesQuery {
    let available: boolean | undefined;
    if (params.available !== undefined) {
      if (params.available !== 'true' && params.available !== 'false') {
        throw ErrorFactory.badRequest("available must be 'true' or 'false'");
      }
      available = params.available === 'true';
    }

    let type: VehicleType | undefined;
    if (params.type !== undefined) {
      if (
        typeof params.type !== 'string' ||
        !Object.values(VehicleType).includes(params.type as VehicleType)
      ) {
        throw ErrorFactory.badRequest(
          `type must be one of: ${Object.values(VehicleType).join(', ')}`
        );
      }
      type = params.type as VehicleType;
    }

    let deviceId: string | undefined;
    if (params.deviceId !== undefined) {
      if (typeof params.deviceId !== 'string' || params.deviceId.trim() === '') {
        throw ErrorFactory.badRequest('deviceId must be a non-empty string');
      }
      deviceId = params.deviceId;
    }

    return new ListVehiclesQuery(
      available,
      type,
      deviceId,
      parseOptionalPositiveInt(params.limit, 'limit'),
      parseOptionalPositiveInt(params.skip, 'skip')
    );
  }
}

function parseOptionalPositiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw ErrorFactory.badRequest(`${field} must be a non-negative integer`);
  }
  return Number(value);
}
