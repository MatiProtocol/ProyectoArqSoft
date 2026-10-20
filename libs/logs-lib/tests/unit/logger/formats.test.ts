import { getCurrentCorrelationId } from '../../../src/logger/context';
import { correlationFormat } from '../../../src/logger/infrastructure/formats';

jest.mock('../../../src/logger/context', () => ({
  getCurrentCorrelationId: jest.fn(),
}));

const mockedGetCurrentCorrelationId = jest.mocked(getCurrentCorrelationId);

describe('correlationFormat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add correlationId to log info', () => {
    mockedGetCurrentCorrelationId.mockReturnValue('test-correlation-id');

    const transform = correlationFormat();

    const info = {
      level: 'info',
      message: 'test message',
    };

    const result = transform.transform(info);

    expect(result).toEqual({
      level: 'info',
      message: 'test message',
      correlationId: 'test-correlation-id',
    });
  });

  it('should add undefined correlationId when context does not exist', () => {
    mockedGetCurrentCorrelationId.mockReturnValue(undefined);

    const transform = correlationFormat();

    const info = {
      level: 'info',
      message: 'test message',
    };

    const result = transform.transform(info);

    expect(result).toEqual({
      level: 'info',
      message: 'test message',
      correlationId: undefined,
    });
  });
});
