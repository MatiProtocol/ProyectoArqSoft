import { ErrorFactory } from '@move/errors-lib';
import { BookingStatus } from '../../../domain/enums/booking-status';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_SKIP = 0;

type QueryParams = {
  dateFrom?: unknown;
  dateTo?: unknown;
  status?: unknown;
  limit?: unknown;
  skip?: unknown;
};

export class ListCustomerBookingsQuery {
  constructor(
    public readonly userId: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
    public readonly status?: BookingStatus,
    public readonly limit: number = DEFAULT_LIMIT,
    public readonly skip: number = DEFAULT_SKIP
  ) {}

  static fromQueryParams(userId: string, params: QueryParams): ListCustomerBookingsQuery {
    if (typeof userId !== 'string' || userId.trim() === '') {
      throw ErrorFactory.badRequest('userId is required');
    }

    const dateFrom = parseDate(params.dateFrom, 'dateFrom');
    const dateTo = parseDate(params.dateTo, 'dateTo');

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw ErrorFactory.badRequest('dateFrom must be before or equal to dateTo');
    }

    return new ListCustomerBookingsQuery(
      userId.trim(),
      dateFrom,
      dateTo,
      parseStatus(params.status),
      parseLimit(params.limit),
      parseSkip(params.skip)
    );
  }
}

function parseDate(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw ErrorFactory.badRequest(`${field} must be a valid date`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw ErrorFactory.badRequest(`${field} must be a valid date`);
  }

  return date;
}

function parseStatus(value: unknown): BookingStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw ErrorFactory.badRequest('status must be valid');
  }

  const status = value.trim() as BookingStatus;
  if (!Object.values(BookingStatus).includes(status)) {
    throw ErrorFactory.badRequest('status must be valid');
  }

  return status;
}

function parseLimit(value: unknown): number {
  if (value === undefined) return DEFAULT_LIMIT;

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) {
    throw ErrorFactory.badRequest(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  return limit;
}

function parseSkip(value: unknown): number {
  if (value === undefined) return DEFAULT_SKIP;

  const skip = Number(value);
  if (!Number.isInteger(skip) || skip < 0) {
    throw ErrorFactory.badRequest('skip must be a non-negative integer');
  }

  return skip;
}
