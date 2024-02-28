// 由 stc 生成
export type IDefaultObject<T = unknown> = {
  [key: string]: T;
};

export interface IRequestParams {
  path?: IDefaultObject;
  query?: IDefaultObject;
  body?: IDefaultObject;
  formData?: IDefaultObject;
  header?: IDefaultObject;
  timeout?: number;
}

/**
 * 生成 URL
 * @param url - 需要处理的 URL
 * @param path - 路由参数
 */
export const generateURL = (url: string, path?: IDefaultObject) => {
  const newURL = url.replace(
    /[\\{|:](\w+)[\\}]?/gi,
    (_key: string, _value: string): string => {
      return path ? (path[_value] as string) : "";
    },
  );

  return newURL;
};
