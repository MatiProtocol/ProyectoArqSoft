import { ErrorFactory } from './error-factory';

export function trySync<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw ErrorFactory.fromUnknown(error);
  }
}

export async function tryAsync<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    throw ErrorFactory.fromUnknown(error);
  }
}
