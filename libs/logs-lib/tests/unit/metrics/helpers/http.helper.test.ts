import { getServiceName } from '../../../../src/config/env';
import { incrementHttp, observeHttpDuration } from '../../../../src/metrics/helpers/http.helper';
import {
  httpRequestCounter,
  httpRequestDuration,
} from '../../../../src/metrics/metrics/http.metrics';

jest.mock('../../../../src/config/env', () => ({
  getServiceName: jest.fn(),
}));

const mockedServiceName = jest.mocked(getServiceName);

jest.mock('../../../../src/metrics/metrics/http.metrics', () => ({
  httpRequestCounter: {
    inc: jest.fn(),
  },
  httpRequestDuration: {
    observe: jest.fn(),
  },
}));

describe('http.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedServiceName.mockReturnValue('test-service');
  });

  describe('incrementHttp', () => {
    it('should increment http request counter with correct labels', () => {
      incrementHttp('GET', '/users', 200);

      expect(httpRequestCounter.inc).toHaveBeenCalledTimes(1);
      expect(httpRequestCounter.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/users',
        status_code: 200,
        service: 'test-service',
      });
    });
  });

  describe('observeHttpDuration', () => {
    it('should observe request duration with correct labels', () => {
      observeHttpDuration('POST', '/users', 201, 123);

      expect(httpRequestDuration.observe).toHaveBeenCalledTimes(1);
      expect(httpRequestDuration.observe).toHaveBeenCalledWith(
        {
          method: 'POST',
          route: '/users',
          status_code: 201,
          service: 'test-service',
        },
        123
      );
    });
  });
});
