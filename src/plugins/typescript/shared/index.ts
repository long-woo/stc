export const createBaseFile = () =>
  `export type IDefaultObject<T = unknown> = {
  [key: string]: T;
};

/**
 * 生成 URL
 * @param url - 需要处理的 URL
 * @param path - 路由参数
 */
export const generateURL = (url: string, path?: IDefaultObject) => {
  const newURL = url.replace(
    /[\\\{|:](\\w+)[\\\}]?/gi,
    (_key: string, _value: string): string => {
      return path ? (path[_value] as string) : "";
    },
  );

  return newURL;
};`;

export const createAxiosFile = () =>
  `import type { AxiosDefaults, AxiosInstance, Method } from "axios";
import axios from "axios";
import type { IDefaultObject } from "../webClientBase";
import { generateURL } from "../webClientBase";

/**
 * API 请求
 */
export class WebClient {
  private static axiosInstance: AxiosInstance;
  private static onError: ((message: string) => void) | undefined;
  private static errorIgnore: string[] = [];

  public static request<T>(
    url: string,
    method: Method,
    req?: IDefaultObject,
  ) {
    const _url = generateURL(url, req?.path as IDefaultObject);
    const _formData: IDefaultObject = req?.formData as IDefaultObject;

    let _data: IDefaultObject | FormData | unknown = req?.body;

    // 处理 FormData 数据
    if (_formData) {
      const formData = new FormData();

      Object.keys(_formData).forEach((key) => {
        formData.append(key, _formData[key] as string | Blob);
      });

      _data = formData;
    }

    return WebClient.axiosInstance.request<T, T>({
      url: _url,
      method,
      data: _data,
      params: req?.query,
      headers: req?.header,
      timeout: req?.timeout
    });
  }

  /**
   * 创建请求，并配置
   * @param config - 请求配置
   * @returns
   */
  public static createAxios(
    config: Pick<AxiosDefaults, "baseURL" | "timeout" | "withCredentials"> & {
      /**
       * 错误回调函数
       */
      error?: (message: string) => void;
      /**
       * 忽略错误发生的 url 或 baseURL，不触发 error 回调函数。eg. /api/test
       */
      errorIgnore?: string[];
    },
  ) {
    WebClient.axiosInstance = axios.create({
      timeout: config.timeout ?? 5000,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials ?? false,
    });

    WebClient.onError = config.error;
    WebClient.errorIgnore = config.errorIgnore ?? [];

    return WebClient.axiosInstance;
  }
}

export default WebClient;`;

export const createWechatFile = () =>
  `import type { IDefaultObject } from "../webClientBase";
import { generateURL } from "../webClientBase";

type Method =
  | "OPTIONS"
  | "GET"
  | "POST"
  | "HEAD"
  | "PUT"
  | "DELETE"
  | "TRACE"
  | "CONNECT";

export class WebClient {
  private static baseURL: string;
  private static onError: ((msg: string) => void) | undefined;

  public static request<T>(
    url: string,
    method: Method,
    req?: IDefaultObject,
  ) {
    const _url = generateURL(url, req?.path as IDefaultObject);

    // query 参数处理
    const _query: IDefaultObject<string> =
      (req?.query as IDefaultObject<string>) ?? {};
    const _params = Object.keys(_query).reduce(
      (prev: Array<string>, current) => {
        prev.push(\`\${current}=\${encodeURIComponent(_query[current])}\`);
        return prev;
      },
      [],
    );

    return new Promise<T>((resolve, reject) => {
      wx.request({
        url: \`\${WebClient.baseURL}\${_url}?\${_params.join("&")}\`,
        method,
        data: (req?.body ?? {}) as IDefaultObject,
        header: (req?.header ?? {}) as IDefaultObject,
        success: (res) => {
          const resData: any = res.data ?? {};

          if (!resData.success) {
            WebClient.onError?.(resData.message);
          }
          resolve(resData);
        },
        fail: (err) => {
          WebClient.onError?.(err.errMsg);
          reject(err);
        },
      });
    });
  }

  /**
   * 创建请求，并配置
   * @param options - 请求配置
   */
  public static create(
    options: { baseURL: string; onError?: (msg: string) => void },
  ) {
    WebClient.baseURL = options.baseURL;
    WebClient.onError = options.onError;
  }
}

export default WebClient;`;
