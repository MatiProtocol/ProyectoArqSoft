import { ErrorFactory } from '@move/errors-lib';
import { parseNumericId } from '../../../domain/validate-numeric-id';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export class GetTransferPositionsQuery {
  constructor(
    public readonly transferId: number,
    public readonly limit: number
  ) {}

  static create(transferIdParam: string, params: { limit?: unknown }): GetTransferPositionsQuery {
    return new GetTransferPositionsQuery(
      parseNumericId(transferIdParam, 'Transfer'),
      parseLimit(params.limit)
    );
  }
}

function parseLimit(value: unknown): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw ErrorFactory.badRequest('limit must be a non-negative integer');
  }
  return Math.min(Number(value), MAX_LIMIT);
}
