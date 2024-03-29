// 由 stc 生成
import type { IDefaultObject, IRequestParams } from "../webClientBase.ts";
import { generateURL } from "../webClientBase.ts";

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
    req?: IRequestParams,
  ) {
    const _url = generateURL(url, req?.path as unknown as IDefaultObject);

    // query 参数处理
    const _query: IDefaultObject<string> =
      (req?.query as IDefaultObject<string>) ?? {};
    const _params = Object.keys(_query).reduce(
      (prev: Array<string>, current) => {
        prev.push(`${current}=${encodeURIComponent(_query[current])}`);
        return prev;
      },
      [],
    );

    return new Promise<T>((resolve, reject) => {
      wx.request({
        url: `${this.baseURL}${_url}?${_params.join("&")}`,
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

export default WebClient;
