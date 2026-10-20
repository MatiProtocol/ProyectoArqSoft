import { ErrorFactory } from '../../../src/application/error-factory';
import { tryAsync, trySync } from '../../../src/application/try-helpers';
import { BadRequestError } from '../../../src/domain/errors/bad-request';

jest.mock('../../../src/application/error-factory');

const mockedErrorFactory = jest.mocked(ErrorFactory);

describe('try-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trySync', () => {
    it('should return the result of the synchronous function when successful', () => {
      const result = { data: 'ok' };
      const fn = jest.fn().mockReturnValue(result);

      const output = trySync(fn);

      expect(output).toBe(result);
      expect(mockedErrorFactory.fromUnknown).not.toHaveBeenCalled();
    });

    it('should catch error and convert it via ErrorFactory.fromUnknown', () => {
      const originalError = new Error('Sync failure');
      const appError = new BadRequestError('Converted');
      const fn = jest.fn().mockImplementation(() => {
        throw originalError;
      });

      mockedErrorFactory.fromUnknown.mockReturnValue(appError);

      expect(() => trySync(fn)).toThrow(appError);
      expect(mockedErrorFactory.fromUnknown).toHaveBeenCalledWith(originalError);
    });

    it('should convert non-Error throw values via ErrorFactory.fromUnknown', () => {
      const thrown = 'string error';
      const appError = new BadRequestError('Converted');
      const fn = jest.fn().mockImplementation(() => {
        throw thrown;
      });

      mockedErrorFactory.fromUnknown.mockReturnValue(appError);

      expect(() => trySync(fn)).toThrow(appError);
      expect(mockedErrorFactory.fromUnknown).toHaveBeenCalledWith(thrown);
    });
  });

  describe('tryAsync', () => {
    it('should resolve with the promise value when successful', async () => {
      const value = { data: 'ok' };
      const promise = Promise.resolve(value);

      const result = await tryAsync(promise);

      expect(result).toBe(value);
      expect(mockedErrorFactory.fromUnknown).not.toHaveBeenCalled();
    });

    it('should catch rejection and convert it via ErrorFactory.fromUnknown', async () => {
      const originalError = new Error('Async failure');
      const appError = new BadRequestError('Converted');
      const promise = Promise.reject(originalError);

      mockedErrorFactory.fromUnknown.mockReturnValue(appError);

      await expect(tryAsync(promise)).rejects.toThrow(appError);
      expect(mockedErrorFactory.fromUnknown).toHaveBeenCalledWith(originalError);
    });

    it('should convert non-Error rejections via ErrorFactory.fromUnknown', async () => {
      const rejected = { code: 500 };
      const appError = new BadRequestError('Converted');
      const promise = Promise.reject(rejected);

      mockedErrorFactory.fromUnknown.mockReturnValue(appError);

      await expect(tryAsync(promise)).rejects.toThrow(appError);
      expect(mockedErrorFactory.fromUnknown).toHaveBeenCalledWith(rejected);
    });
  });
});
