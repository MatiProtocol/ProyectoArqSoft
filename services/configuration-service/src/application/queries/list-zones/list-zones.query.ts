import { ErrorFactory } from '@move/errors-lib';
import { ZoneType } from '../../../domain/enums/zone-type';

export class ListZonesQuery {
  constructor(
    public readonly type?: ZoneType,
    public readonly limit?: number,
    public readonly skip?: number
  ) {}

  static fromQueryParams(params: {
    type?: unknown;
    limit?: unknown;
    skip?: unknown;
  }): ListZonesQuery {
    let type: ZoneType | undefined;
    if (params.type !== undefined) {
      if (
        typeof params.type !== 'string' ||
        !Object.values(ZoneType).includes(params.type as ZoneType)
      ) {
        throw ErrorFactory.badRequest(`type must be one of: ${Object.values(ZoneType).join(', ')}`);
      }
      type = params.type as ZoneType;
    }

    return new ListZonesQuery(
      type,
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
