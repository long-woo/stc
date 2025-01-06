import type {
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import axios from "axios";

import type { ApiClientConfig, IDefaultObject } from "../apiClientBase";

let axiosInstance: AxiosInstance;
let errorIgnore: string[] = [];
let onError: ((message: string) => void) | undefined;
let onLogin: (() => void) | undefined;

const requestInterceptor = () => {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig<any>) => {
      return config;
    },
    (error: any) => {
      return Promise.resolve(error);
    },
  );
};

const responseInterceptor = () => {
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse<any, any>) => {
      const _data = response.data;
      const _config = response.config;
      const _errorIgnore = errorIgnore.includes(_config.url ?? "") ||
        errorIgnore.includes(_config.baseURL ?? "");

      // 全局提示。忽略排除的 url 或 baseURL
      if (!_errorIgnore) {
        onError?.(_data);
      }

      if (response.status === 401) {
        onLogin?.();
      }

      return _data;
    },
    (error: any) => {
      // 取消的请求，无需抛出错误到 'onError' 回调函数
      if (!axios.isCancel(error)) {
        onError?.("network error.");
      }

      return Promise.resolve(error);
    },
  );
};

/**
 * Creates an Axios instance with the provided configuration.
 *
 * @param {Omit<ApiClientConfig, "url" | "signal" | "config">} config - The configuration object for the Axios instance.
 */
export const createAxios = (
  config: Omit<ApiClientConfig, "url" | "signal" | "config">,
): void => {
  axiosInstance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 5000,
    withCredentials: config.withCredentials ?? false,
  });

  errorIgnore = config.errorIgnore ?? [];
  onError = config.onError;
  onLogin = config.onLogin;

  requestInterceptor();
  responseInterceptor();
};

/**
 * Makes a request using the provided configuration.
 *
 * @param {ApiClientConfig} config - The configuration object for the request.
 * @return {Promise<T>} A promise that resolves with the response data.
 */
export const request = <T>(
  config: ApiClientConfig,
): Promise<T> => {
  const _formData: IDefaultObject = config.params?.formData as IDefaultObject;

  let _data: IDefaultObject | FormData | unknown = config.params?.body;

  // 处理 FormData 数据
  if (_formData) {
    const formData = new FormData();

    Object.keys(_formData).forEach((key) => {
      formData.append(key, _formData[key] as string | Blob);
    });

    _data = formData;
  }

  return axiosInstance.request<T, T>({
    url: config.url,
    method: config.method,
    data: _data,
    params: config.params?.query,
    headers: config.params?.header as AxiosHeaders,
    timeout: config.config?.timeout,
    signal: config.config?.signal,
    baseURL: config.config?.baseURL,
  });
};
