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
  /**
   * 错误回调函数
   */
  onError?: (message: string) => void;
  /**
   * 忽略错误发生的 url 或 baseURL，不触发 error 回调函数。eg. /api/test
   */
  errorIgnore?: string[];
  config?: Pick<WebClientConfig, "timeout" | "signal">;
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
