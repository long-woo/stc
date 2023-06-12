// 由 swagger2code 生成
import type { AxiosDefaults, AxiosInstance, Method } from "axios";
import axios from "axios";
import type { IDefaultObject } from "../webClientBase";
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
    req?: IDefaultObject<unknown>,
  ) {
    const _url = this.generateURL(url, req?.path as unknown as IDefaultObject);
    const _formData: IDefaultObject = req?.formData as IDefaultObject;

    let _data: IDefaultObject | FormData | unknown = req?.data;

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

export default WebClient;
