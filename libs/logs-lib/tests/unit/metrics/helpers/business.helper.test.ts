import { getServiceName } from '../../../../src/config/env';
import { incrementBusinessEvent } from '../../../../src/metrics/helpers/business.helper';
import { businessEventCounter } from '../../../../src/metrics/metrics/business.metrics';

jest.mock('../../../../src/config/env', () => ({
  getServiceName: jest.fn(),
}));

jest.mock('../../../../src/metrics/metrics/business.metrics', () => ({
  businessEventCounter: {
    inc: jest.fn(),
  },
}));

const mockedGetServiceName = jest.mocked(getServiceName);

describe('business.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetServiceName.mockReturnValue('test-service');
  });

  describe('incrementBusinessEvent', () => {
    it('should increment business event counter with provided category', () => {
      incrementBusinessEvent('order_created', 'orders');

      expect(businessEventCounter.inc).toHaveBeenCalledTimes(1);
      expect(businessEventCounter.inc).toHaveBeenCalledWith({
        event_type: 'order_created',
        category: 'orders',
        service: 'test-service',
      });
    });

    it('should use unknown as default category', () => {
      incrementBusinessEvent('order_created');

      expect(businessEventCounter.inc).toHaveBeenCalledTimes(1);
      expect(businessEventCounter.inc).toHaveBeenCalledWith({
        event_type: 'order_created',
        category: 'unknown',
        service: 'test-service',
      });
    });
  });
});
