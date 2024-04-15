export const createBaseFile = () =>
  `export type IDefaultObject<T = any> = {
  [key: string]: T;
};
  
export type ApiClientMethod = "GET" | "POST" | "PUT" | "DELETE";
  
export interface ApiClientParams {
  path?: IDefaultObject;
  query?: IDefaultObject;
  body?: any;
  formData?: IDefaultObject;
  header?: IDefaultObject;
}

export interface ApiClientConfig {
  baseURL?: string;
  url?: string;
  method?: ApiClientMethod;
  params?: ApiClientParams;
  timeout?: number;
  signal?: AbortSignal;
  withCredentials?: boolean;
  /**
   * 忽略错误发生的 url 或 baseURL，不触发 error 回调函数。示例：/api/test
   */
  errorIgnore?: string[];
  abortUrls?: string[];
  config?: Pick<ApiClientConfig, "timeout" | "signal">;
  /**
   * 错误回调函数
   */
  onError?: (message: string) => void;
  onLogin?: () => void;
}

/**
 * Generates a new URL by replacing placeholders in the input URL with values from the provided path object.
 *
 * @param {string} url - The original URL with placeholders to be replaced.
 * @param {IDefaultObject} [path] - An optional object containing key-value pairs to replace in the URL.
 * @return {string} The new URL with placeholders replaced by values from the path object.
 */
export const generateURL = (url: string, path?: IDefaultObject) => {
  const newURL = url.replace(
    /[\\\{|:](\\w+)[\\\}]?/gi,
    (_key: string, _value: string): string => {
      return path ? (path[_value] as string) : "";
    },
  );

  return newURL;
};

/**
 * Returns an array of query parameters formatted as key-value pairs joined by "&".
 *
 * @param {IDefaultObject<string>} query - An object containing query parameters.
 * @return {string} The formatted query parameters joined by "&".
 */
export const getRequestParams = (query: IDefaultObject<string>) =>
  Object.keys(query).reduce(
    (prev: Array<string>, current) => {
      prev.push(\`\${current}=\${encodeURIComponent(query[current])}\`);
      return prev;
    },
    [],
  ).join("&");
`;

export const createFetchRuntimeFile = () =>
  `import type {
  IDefaultObject,
  ApiClientConfig,
  ApiClientMethod,
  ApiClientParams,
} from "./apiClientBase.ts";
import { generateURL } from "./apiClientBase.ts";
<% if (it.platform === "wechat") { %>
import { request } from "./wechat/index.ts";
<% } else { %>
import { createAxios, request } from "./axios/index.ts";
<% } %>

let apiClientInstance: ApiClientConfig;

export const createApiClient = (
  config: Omit<ApiClientConfig, "url" | "signal" | "config">,
) => {
  apiClientInstance = config;
<% if (it.platform === "axios") { %>
  createAxios(config);
<% } %>
};

export const fetchRuntime = <T>(
  url: string,
  method: ApiClientMethod,
  req?: ApiClientParams,
  config?: ApiClientConfig,
) => {
  const _url = generateURL(url, req?.path as unknown as IDefaultObject);

  apiClientInstance.url = _url;
  apiClientInstance.method = method;
  apiClientInstance.params = req;
  apiClientInstance.config = config;

  return request<T>(apiClientInstance);
};

/**
 * @deprecated Planned to be removed in \`v1.7.0\`
 * 
 * 1.\`webClient.create\` is modified to \`createApiClient\`
 * 
 * 2.\`webClient.request\` modified to \`fetchRuntime\`
 */
export class ApiClient {
  static create (config: Omit<ApiClientConfig, "url" | "signal" | "config">) {
    createApiClient(config);
  }

  static request<T>(
    url: string,
    method: ApiClientMethod,
    req?: ApiClientParams,
    config?: ApiClientConfig,
  ) {
    return fetchRuntime<T>(url, method, req, config);
  }
}

export default ApiClient;
`;

export const createAxiosFile = () =>
  `import type {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig,
  } from "axios";
import axios from "axios";
  
import type { ApiClientConfig, IDefaultObject } from "../apiClientBase.ts";
  
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
) => {
  axiosInstance = axios.create({
    timeout: config.timeout ?? 5000,
    baseURL: config.baseURL,
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
`;

export const createWechatFile = () =>
  `import type { ApiClientConfig, IDefaultObject } from "../apiClientBase.ts";
import { getRequestParams } from "../apiClientBase.ts";

/**
 * Generate a request to a specified URL with the given parameters.
 *
 * @param {ApiClientConfig} instance - the configuration for the request
 * @return {Promise<T>} a promise that resolves with the response data
 */
export const request = <T>(instance: ApiClientConfig): Promise<T> => {
  const _params = getRequestParams(
    (instance.params?.query as IDefaultObject<string>) ?? {},
  );

  return new Promise<T>((resolve, reject) => {
    // @ts-ignore
    wx.request({
      url: \`\${instance.baseURL}\${instance.url}?\${_params}\`,
      method: instance.method,
      data: (instance.params?.body ?? {}) as IDefaultObject,
      header: (instance.params?.header ?? {}) as IDefaultObject,
      success: (
        // @ts-ignore
        res,
      ) => {
        const resData: any = res.data ?? {};

        if (!resData.success) {
          instance.onError?.(resData.message);
        }
        resolve(resData);
      },
      fail: (
        // @ts-ignore
        err,
      ) => {
        instance.onError?.(err.errMsg);
        reject(err);
      },
    });
  });
};
`;
