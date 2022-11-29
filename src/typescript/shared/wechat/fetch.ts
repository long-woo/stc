import type { IDefaultObject } from "../interface";
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

  private static request<T>(
    url: string,
    method: Method,
    req?: IDefaultObject<unknown>,
  ) {
    const _url = this.generateURL(url, req?.path as unknown as IDefaultObject);
    const _formData: IDefaultObject = req?.formData as IDefaultObject;

    let _data: IDefaultObject | FormData | unknown = req?.data;

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
        url: `${this.baseURL}${_url}`,
        method,
        data: _data,
        params: req?.query,
        headers: req?.header,
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

  /**
   * GET 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static get<T>(
    url: string,
    req?: IDefaultObject,
  ): Promise<T> {
    return this.request<T>(url, "GET", req);
  }

  /**
   * POST 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static post<T>(
    url: string,
    req?: IDefaultObject,
  ): Promise<T> {
    return this.request<T>(url, "POST", req);
  }

  /**
   * PUT 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static put<T>(
    url: string,
    req?: IDefaultObject,
  ): Promise<T> {
    return this.request<T>(url, "PUT", req);
  }

  /**
   * DELETE 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static delete<T>(
    url: string,
    req?: IDefaultObject,
  ): Promise<T> {
    return this.request<T>(url, "DELETE", req);
  }

  /**
   * HEAD 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   * @returns
   */
  public static head<T>(
    url: string,
    req?: IDefaultObject,
  ): Promise<T> {
    return this.request<T>(url, "HEAD", req);
  }

  /**
   * OPTIONS 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   * @param config - 请求配置，可选
   * @returns
   */
  public static options<T>(
    url: string,
    req?: IDefaultObject,
  ): Promise<T> {
    return this.request<T>(url, "OPTIONS", req);
  }
}

export default WebClient;
