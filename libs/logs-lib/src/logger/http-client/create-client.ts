import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;

type ErrorInterceptor = (error: AxiosError) => any;

export function createHttpClient(
  baseURL: string,
  defaultHeaders: Record<string, string> = {},
  interceptors: {
    onRequest?: RequestInterceptor;
    onResponse?: ResponseInterceptor;
    onError?: ErrorInterceptor;
  } = {}
): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    },
    timeout: 10000,
  });

  if (interceptors.onRequest) {
    client.interceptors.request.use(interceptors.onRequest);
  }

  if (interceptors.onResponse || interceptors.onError) {
    client.interceptors.response.use(interceptors.onResponse, interceptors.onError);
  }

  return client;
}
