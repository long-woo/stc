// 由 stc 生成
import type { IDefaultObject, IRequestParams } from "../webClientBase";
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
  private static onError: ((msg: string) => void) | undefined;

  public static request<T>(
    url: string,
    method: Method,
    req?: IRequestParams,
  ) {
    const _url = this.generateURL(url, req?.path as unknown as IDefaultObject);

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

    const _data: IDefaultObject = req?.body ?? {};

    return new Promise<T>((resolve, reject) => {
      wx.request({
        url: `${this.baseURL}${_url}?${_params.join("&")}`,
        method,
        data: _data,
        header: req?.header,
        success: (res) => {
          const resData: any = res.data ?? {};

          if (!resData.success) {
            this.onError?.(resData.message);
          }
          resolve(resData);
        },
        fail: (err) => {
          this.onError?.(err.errMsg);
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
    this.baseURL = options.baseURL;
    this.onError = options.onError;
  }
}

export default WebClient;
