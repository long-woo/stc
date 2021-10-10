// 由 swagger2code 生成
export interface IDefaultObject<T = string> {
  [key: string]: T;
}

export interface IRequestParams<Q = unknown, B = unknown, P = unknown> {
  path?: P;
  query?: Q;
  body?: B;
}
