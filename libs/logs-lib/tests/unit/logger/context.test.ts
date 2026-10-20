jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

import {
  generateCorrelationId,
  getCurrentCorrelationId,
  runWithContext,
} from '../../../src/logger/context';

describe('correlation-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCorrelationId', () => {
    it('should generate a valid uuid', () => {
      const result = generateCorrelationId();

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('getCurrentCorrelationId', () => {
    it('should return null when no context exists', () => {
      expect(getCurrentCorrelationId()).toBeUndefined();
    });
  });

  describe('runWithContext', () => {
    it('should use provided correlation id', () => {
      const result = runWithContext('my-correlation-id', () => {
        return getCurrentCorrelationId();
      });

      expect(result).toBe('my-correlation-id');
    });

    it('should generate correlation id when not provided', () => {
      const result = runWithContext(undefined, () => {
        return getCurrentCorrelationId();
      });

      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
    });

    it('should preserve context during callback execution', () => {
      const callback = jest.fn(() => {
        return getCurrentCorrelationId();
      });

      const result = runWithContext('test-id', callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-id');
    });
  });
});
