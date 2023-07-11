export const createBaseFile = () =>
  `export type IDefaultObject<T = unknown> = {
  [key: string]: T;
};

export interface IRequestParams {
  path: Array<unknown>;
  query: Array<unknown>;
  body: Array<unknown>;
  formData: Array<unknown>;
  header: Array<unknown>;
}

export class WebClientBase {
  /**
   * 生成 URL
   * @param url - 需要处理的 URL
   * @param path - 路由参数
   */
  static generateURL(url: string, path?: IDefaultObject) {
    // 替换路由参数
    const newURL = url.replace(
      /[\{|:](\w+)[\}]?/gi,
      (_key: string, _value: string): string => {
        return path ? path[_value] as string : "";
      },
    );

    return newURL;
  }
}`;

export const createAxiosFile = () =>
  `import type { AxiosDefaults, AxiosInstance, Method } from "axios";
import axios from "axios";
import type { IDefaultObject, IRequestParams } from "../webClientBase";
import { WebClientBase } from "../webClientBase";

/**
 * API 请求
 */
export class WebClient extends WebClientBase {
  private static axiosInstance: AxiosInstance;
  // private static onError: ((message: string) => void) | undefined;
  // private static errorIgnore: string[] = [];

  public static request<T>(
    url: string,
    method: Method,
    req?: IRequestParams,
  ) {
    const _url = this.generateURL(url, req?.path as unknown as IDefaultObject);
    const _formData: IDefaultObject = req?.formData as IDefaultObject;

    let _data: IDefaultObject | FormData | unknown = req?.body;

    // 处理 FormData 数据
    if (_formData) {
      const formData = new FormData();

      Object.keys(_formData).forEach((key) => {
        formData.append(key, _formData[key]);
      });

      _data = formData;
    }

    return this.axiosInstance.request<T, T>({
      url: _url,
      method,
      data: _data,
      params: req?.query,
      headers: req?.header,
    });
  }

  /**
   * 创建请求，并配置
   * @param config - 请求配置
   * @returns
   */
  public static createAxios(
    config: Pick<AxiosDefaults, "baseURL" | "timeout" | "withCredentials"> & {
      // /**
      //  * 错误回调函数
      //  */
      // error?: (message: string) => void;
      // /**
      //  * 忽略错误发生的 url 或 baseURL，不触发 error 回调函数。eg. /api/test
      //  */
      // errorIgnore?: string[];
    },
  ) {
    this.axiosInstance = axios.create({
      timeout: config.timeout ?? 5000,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials ?? false,
    });

    // this.onError = config.error;
    // this.errorIgnore = config.errorIgnore ?? [];

    return this.axiosInstance;
  }
}

export default WebClient;`;

export const createWechatFile = () =>
  `import type { IDefaultObject, IRequestParams } from "../webClientBase";
import { WebClientBase } from "../webClientBase";

type Method =
  | "OPTIONS"
  | "GET"
  | "POST"
  | "HEAD"
  | "PUT"
  | "DELETE"
  | "TRACE"
  | "CONNECT";

export class WebClient extends WebClientBase {
  private static baseURL: string;

  public static request<T>(
    url: string,
    method: Method,
    req?: IRequestParams,
  ) {
    const _url = this.generateURL(url, req?.path as unknown as IDefaultObject);

    // query 参数处理
    const _query = req?.query ?? {};
    const _params = Object.keys(_query).reduce(
      (prev: Array<string>, current) => {
        prev.push(\`\${current}=\${encodeURIComponent(_query[current])}\`);
        return prev;
      },
      [],
    );

    const _formData: IDefaultObject = req?.formData as IDefaultObject;
    let _data: IDefaultObject | FormData | unknown = req?.body;

    // TODO: 处理 FormData 数据
    if (_formData) {
      const formData = new FormData();

      Object.keys(_formData).forEach((key) => {
        formData.append(key, _formData[key]);
      });

      _data = formData;
    }

    return new Promise<T>((resolve, reject) => {
      wx.request({
        url: \`\${this.baseURL}\${_url}?\${_params.join("&")}\`,
        method,
        data: _data,
        header: req?.header,
        success: (res: unknown) => {
          resolve(res.data);
        },
        fail: (err: unknown) => {
          reject(err);
        },
      });
    });
  }

  /**
   * 创建请求，并配置
   * @param options - 请求配置
   */
  public static create(options: { baseURL: string }) {
    this.baseURL = options.baseURL;
  }
}

export default WebClient;`;
