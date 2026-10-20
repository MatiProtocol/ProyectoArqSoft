import { getServiceName } from '../../config/env';
import { httpRequestCounter, httpRequestDuration } from '../metrics/http.metrics';

export function incrementHttp(method: string, route: string, statusCode: number): void {
  const service = getServiceName();

  httpRequestCounter.inc({
    method,
    route,
    status_code: statusCode,
    service,
  });
}

export function observeHttpDuration(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number
): void {
  const service = getServiceName();

  httpRequestDuration.observe(
    {
      method,
      route,
      status_code: statusCode,
      service,
    },
    durationMs
  );
}
