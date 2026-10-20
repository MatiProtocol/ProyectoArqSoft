import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { createHttpClient } from '../../../../src/logger/http-client/create-client';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;

type ErrorInterceptor = (error: AxiosError) => unknown;

function createMockClient() {
  const useRequest = jest.fn();
  const useResponse = jest.fn();

  const client = {
    interceptors: {
      request: {
        use: useRequest,
      },
      response: {
        use: useResponse,
      },
    },
  } as unknown as AxiosInstance;

  return { client, useRequest, useResponse };
}

describe('createHttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create axios client with default config', () => {
    const { client } = createMockClient();

    mockedAxios.create.mockReturnValue(client);

    const result = createHttpClient('http://api.test');

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://api.test',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    expect(result).toBe(client);
  });

  it('should merge default headers', () => {
    const { client } = createMockClient();

    mockedAxios.create.mockReturnValue(client);

    createHttpClient('http://api.test', {
      Authorization: 'Bearer token',
    });

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://api.test',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      timeout: 10000,
    });
  });

  it('should register request interceptor', () => {
    const { client, useRequest } = createMockClient();

    mockedAxios.create.mockReturnValue(client);

    const onRequest = jest.fn((config: InternalAxiosRequestConfig) => config);

    createHttpClient('http://api.test', {}, { onRequest });

    expect(useRequest).toHaveBeenCalledTimes(1);
    expect(useRequest).toHaveBeenCalledWith(onRequest);
  });

  it('should register response and error interceptors', () => {
    const { client, useResponse } = createMockClient();

    mockedAxios.create.mockReturnValue(client);

    const onResponse = jest.fn((r: AxiosResponse) => r);
    const onError = jest.fn((e: AxiosError) => {
      throw e;
    });

    createHttpClient(
      'http://api.test',
      {},
      {
        onResponse,
        onError,
      }
    );

    expect(useResponse).toHaveBeenCalledTimes(1);

    expect(useResponse).toHaveBeenCalledWith(onResponse, onError);
  });
});
