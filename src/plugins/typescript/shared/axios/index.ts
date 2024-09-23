import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import axios from "axios";

import type { ApiClientConfig, IDefaultObject } from "../apiClientBase";

type RequestConfig = AxiosRequestConfig<Record<string, unknown>>;

let axiosInstance: AxiosInstance;
let abortUrls: string[] = [];
let errorIgnore: string[] = [];
let onError: ((message: string) => void) | undefined;
let onLogin: (() => void) | undefined;
const pendingMap = new Map<string, AbortController>();

const addPending = (config: RequestConfig) => {
  const url = config.url ?? "";
  const data = config.data ?? {};
  const controller = new AbortController();

  if (
    !url.includes("add_pending=true") &&
    !data.addPending &&
    !abortUrls.includes(url)
  ) {
    return;
  }

  if (!pendingMap.has(url)) {
    config.signal = controller.signal;
    pendingMap.set(url, controller);
  }
};

const removePending = (config: RequestConfig) => {
  const url = config.url ?? "";

  if (url && pendingMap.has(url)) {
    pendingMap.get(url)?.abort();
    pendingMap.delete(url);
  }
};

const requestInterceptor = () => {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig<any>) => {
      removePending(config);
      addPending(config);

      return config;
    },
    (error: any) => {
      return Promise.reject(error);
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
        // onError?.(_data.message);
      }

      if (response.status === 401) {
        onLogin?.();
      }

      removePending(_config);
      return _data;
    },
    (error: any) => {
      // 取消的请求，无需抛出错误到 'onError' 回调函数
      if (!axios.isCancel(error)) {
        onError?.("network error.");
      }

      return Promise.reject(error);
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
  abortUrls = config.abortUrls ?? [];
  onError = config.onError;
  onLogin = config.onLogin;

  requestInterceptor();
  responseInterceptor();
};

/**
 * Sends a request using the provided WebClientConfig instance. If formData is included in the instance parameters, it is processed and sent as FormData.
 *
 * @param {ApiClientConfig} instance - the configuration object for the request
 * @return {Promise<T>} a Promise that resolves with the response data
 */
export const request = <T>(
  instance: ApiClientConfig,
): Promise<T> => {
  const _formData: IDefaultObject = instance.params?.formData as IDefaultObject;

  let _data: IDefaultObject | FormData | unknown = instance.params?.body;

  // 处理 FormData 数据
  if (_formData) {
    const formData = new FormData();

    Object.keys(_formData).forEach((key) => {
      formData.append(key, _formData[key] as string | Blob);
    });

    _data = formData;
  }

  return axiosInstance.request<T, T>({
    url: instance.url,
    method: instance.method,
    data: _data,
    params: instance.params?.query,
    headers: instance.params?.header,
    timeout: instance.config?.timeout,
    signal: instance.config?.signal,
  });
};
