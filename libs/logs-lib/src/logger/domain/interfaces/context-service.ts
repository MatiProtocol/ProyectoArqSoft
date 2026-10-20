export interface IContextService {
  runWithContext: <T>(correlationId: string, fn: () => Promise<T>) => Promise<T>;
  generateCorrelationId: () => string;
}
