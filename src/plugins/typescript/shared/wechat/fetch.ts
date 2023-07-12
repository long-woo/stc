// 由 stc 生成
import type { IDefaultObject, IRequestParams } from "../webClientBase";
import { WebClientBase } from "../webClientBase.ts";

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
        prev.push(
          `${current}=${
            encodeURIComponent(_query[current as keyof typeof _query])
          }`,
        );
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
        url: `${this.baseURL}${_url}?${_params.join("&")}`,
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

export default WebClient;
