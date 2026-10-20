import { ErrorFactory } from '@move/errors-lib';

export function parseNumericId(id: string, resource: string): number {
  if (!/^\d+$/.test(id)) {
    throw ErrorFactory.badRequest(`${resource} id must be a positive integer`);
  }
  return Number(id);
}
