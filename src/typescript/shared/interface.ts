// 由 swagger2code 生成
export interface IDefaultObject<T = string> {
  [key: string]: T;
}

export interface IRequestParams<
  Q = unknown,
  B = unknown,
  P = unknown,
> {
  path?: P;
  query?: Q;
  body?: B;
}

export interface IRequestConfig {
  /**
   * 头信息
   */
  headers?: IDefaultObject;

  /**
   * 响应类型
   */
  responseType?:
    | "arraybuffer"
    | "blob"
    | "document"
    | "json"
    | "text"
    | "stream";
}
