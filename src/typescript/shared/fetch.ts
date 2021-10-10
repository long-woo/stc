// 由 swagger2code 生成
import axios from "axios";
import { IDefaultObject, IRequestParams } from "./interface.ts";

/**
 * API 请求
 */
export class webClient {
  /**
   * GET 请求参数处理
   * @param params - 参数
   */
  private static formaQueryString(params: IDefaultObject): string {
    const query = Object.keys(params).reduce((prev, current) => {
      prev += `${current}=${encodeURIComponent(params[current])}&`;
      return prev;
    }, ``);

    return query;
  }

  /**
   * 生成 URL
   * @param url - 需要处理的 URL
   * @param path - 路由参数
   */
  private static generateURL(url: string, path?: IDefaultObject) {
    // 替换路由参数
    const newURL = url.replace(
      /[\{|:](\w+)[\}]?/gi,
      (_key: string, _value: string) => {
        return path ? path[_value] : "";
      },
    );

    return newURL;
  }

  /**
   * GET 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static get<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.get(url, {
      params: req?.query,
    });
  }

  /**
   * POST 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static post<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.post(url, req?.body, {
      params: req?.query,
    });
  }

  /**
   * PUT 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static put<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.put(url, req?.body, {
      params: req?.query,
    });
  }

  /**
   * DELETE 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   */
  public static delete<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.delete(url, {
      params: req?.query,
    });
  }

  /**
   * HEAD 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   * @returns
   */
  public static head<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.delete(url, {
      params: req?.query,
    });
  }

  /**
   * OPTIONS 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   * @returns
   */
  public static options<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.options(url, {
      params: req?.query,
    });
  }

  /**
   * PATCH 请求
   * @param url - 请求地址
   * @param req - 参数，可选
   * @returns
   */
  public static patch<T>(url: string, req?: IRequestParams): Promise<T> {
    url = this.generateURL(url, req?.path as IDefaultObject);

    return axios.patch(url, req?.body, {
      params: req?.query,
    });
  }
}
