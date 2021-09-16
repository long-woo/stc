// 由 swagger2code 生成
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { IDefaultObject, IRequestParams } from "./interface.ts";

/**
 * axios 配置
 */
// export interface IAxiosConfig {
//   timeout: number; // 超时时间，默认 5000ms
//   baseURL: string; // 基本 URL
// }

/**
 * axios 帮助类
 */
// export class AxiosHelper {
//   private static headers: IDefaultObject = {};
//   private static options: IAxiosConfig = {
//     timeout: 5000,
//     baseURL: `/api`,
//   };

//   constructor() {
//     axios.defaults.timeout = AxiosHelper.options.timeout;
//     axios.defaults.baseURL = AxiosHelper.options.baseURL;

//     this.handleInterceptor();
//   }

//   /**
//    * 拦截器处理
//    */
//   private handleInterceptor(): void {
//     // 请求拦截器
//     axios.interceptors.request.use(
//       (config: AxiosRequestConfig) => {
//         config.headers = {
//           ...config.headers,
//           ...AxiosHelper.headers,
//         };

//         return config;
//       },
//       (error: any) => {
//         return error;
//       },
//     );

//     // 相应拦截器
//     axios.interceptors.response.use(
//       (response: AxiosResponse<any>) => {
//         return response.data;
//       },
//       (error: any) => {
//         const res = error.response || {};
//         const data = res.data || {};
//         const code = data.code || 404;
//         const desc = data.message || data.desc || `请求出错啦^o^`;

//         return { code, desc };
//       },
//     );
//   }

//   /**
//    * 配置 axios
//    * @param options
//    */
//   static config(options: IAxiosConfig): void {
//     this.options = {
//       ...this.options,
//       ...options,
//     };

//     new AxiosHelper();
//   }

//   /**
//    * 设置请求头
//    * @param headers 请求头
//    */
//   static setHeaders(headers: IDefaultObject): void {
//     this.headers = headers;
//   }

//   /**
//    * 请求
//    * @param param
//    *
//    * `method` - 方法
//    *
//    * `url` - 地址
//    *
//    * `data` - 请求体
//    *
//    * `params` - 请求参数
//    *
//    * `headers` - 请求头
//    */
//   static request({
//     method = "get",
//     url,
//     data,
//     params,
//     headers = {},
//   }: AxiosRequestConfig) {
//     return axios({
//       method,
//       url,
//       headers,
//       params,
//       data,
//     });
//   }
// }

// new AxiosHelper();

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
  private static generateURL(url: string, path: string | IDefaultObject = "") {
    // 替换路由参数
    const newURL = url.replace(
      /[\{|:](\w+)[\}]?/gi,
      (_key: string, _value: string) => {
        return typeof path === "string" ? path : path[_value];
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
    url = this.generateURL(url, req?.path);

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
    url = this.generateURL(url, req?.path);

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
    url = this.generateURL(url, req?.path);

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
    url = this.generateURL(url, req?.path);

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
    url = this.generateURL(url, req?.path);

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
    url = this.generateURL(url, req?.path);

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
    url = this.generateURL(url, req?.path);

    return axios.patch(url, req?.body, {
      params: req?.query,
    });
  }
}
