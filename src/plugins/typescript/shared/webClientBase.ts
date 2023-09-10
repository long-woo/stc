// 由 stc 生成
export type IDefaultObject<T = unknown> = {
  [key: string]: T;
};

export interface IRequestParams {
  path: IDefaultObject<unknown>;
  query: IDefaultObject<unknown>;
  body: IDefaultObject<unknown>;
  formData: IDefaultObject<unknown>;
  header: IDefaultObject<unknown>;
}

export class WebClientBase {
  /**
   * 生成 URL
   * @param url - 需要处理的 URL
   * @param path - 路由参数
   */
  static generateURL(url: string, path?: IDefaultObject) {
    // 替换路由参数
    const newURL = url.replace(
      /[\\{|:](\w+)[\\}]?/gi,
      (_key: string, _value: string): string => {
        return path ? path[_value] as string : "";
      },
    );

    return newURL;
  }
}
