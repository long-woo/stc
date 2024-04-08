// 由 stc 生成
export type IDefaultObject<T = unknown> = {
  [key: string]: T;
};

export type WebClientMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface WebClientParams {
  path?: IDefaultObject;
  query?: IDefaultObject;
  body?: IDefaultObject;
  formData?: IDefaultObject;
  header?: IDefaultObject;
}

export interface WebClientConfig {
  baseURL?: string;
  url?: string;
  method?: WebClientMethod;
  params?: WebClientParams;
  timeout?: number;
  signal?: AbortSignal;
  withCredentials?: boolean;
  /**
   * 忽略错误发生的 url 或 baseURL，不触发 error 回调函数。eg. /api/test
   */
  errorIgnore?: string[];
  abortUrls?: string[];
  config?: Pick<WebClientConfig, "timeout" | "signal">;
  /**
   * 错误回调函数
   */
  onError?: (message: string) => void;
  onLogin?: () => void;
}

/**
 * 生成 URL
 * @param url - 需要处理的 URL
 * @param path - 路由参数
 */
export const generateURL = (url: string, path?: IDefaultObject) => {
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
export const getRequestParams = (query: IDefaultObject<string>) =>
  Object.keys(query).reduce(
    (prev: Array<string>, current) => {
      prev.push(`${current}=${encodeURIComponent(query[current])}`);
      return prev;
    },
    [],
  ).join("&");
