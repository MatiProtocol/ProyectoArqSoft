import { getServiceName } from '../../config/env';
import { businessEventCounter } from '../metrics/business.metrics';

export function incrementBusinessEvent(eventType: string, category = 'unknown') {
  businessEventCounter.inc({
    event_type: eventType,
    category,
    service: getServiceName(),
  });
}
