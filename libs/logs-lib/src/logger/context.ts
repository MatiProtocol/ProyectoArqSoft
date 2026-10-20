import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuidv4 } from 'uuid';

interface CorrelationContext {
  correlationId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

export function runWithContext<T>(correlationId: string | undefined, callback: () => T): T {
  const id = correlationId || uuidv4();

  return asyncLocalStorage.run({ correlationId: id }, callback);
}

export function getCurrentCorrelationId(): string | undefined {
  const store = asyncLocalStorage.getStore();

  return store?.correlationId ?? undefined;
}

export function generateCorrelationId(): string {
  return uuidv4();
}
