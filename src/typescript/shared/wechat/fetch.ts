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
        url: _url,
        method,
        data: _data,
        params: req?.query,
        headers: req?.header,
        success: (res: unknown) => {
          resolve(res.data);
        },
      });
    });
  }
}

export default WebClient;
