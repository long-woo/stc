import { IDefaultObject, ISwaggerResultPaths } from "./swagger.ts";

export const generatePath = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPaths>>,
) => {
  const pathMap = new Map<string, any[]>();

  Object.keys(paths).forEach((url) => {
    // 请求方式
    const methods = paths[url];

    Object.keys(methods).reduce((prev, current) => {
      return prev;
    });
    // const name = getMethodName()
  });
};
