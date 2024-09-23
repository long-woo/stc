export type IDefaultObject<T = unknown> = {
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
export const generateURL = (url: string, path?: IDefaultObject): string => {
  const newURL = url.replace(
    /[\\{|:](\w+)[\\}]?/gi,
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
export const getRequestParams = (query: IDefaultObject<string>): string =>
  Object.keys(query).reduce(
    (prev: Array<string>, current) => {
      prev.push(`${current}=${encodeURIComponent(query[current])}`);
      return prev;
    },
    [],
  ).join("&");
