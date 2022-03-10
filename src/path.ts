import {
  IDefaultObject,
  IPathParameter,
  IPathVirtualProperty,
  ISwaggerResultPath,
} from "./swagger.ts";

/**
 * 获取请求对象
 * @param url - 接口地址
 * @param method - 请求方式
 * @param pathMethod - 请求对象
 * @returns
 */
const getPathVirtualProperty = (
  url: string,
  method: string,
  pathMethod: ISwaggerResultPath,
): IPathVirtualProperty => {
  // 请求参数
  const parameters = pathMethod.parameters
    ?.map((param): IPathParameter => ({
      category: param.in,
      name: param.name,
      type: param.type,
      required: param.required,
      description: param.description,
      format: param.format,
    }));
  // 响应
  const response = pathMethod.responses[200]?.schema?.$ref?.replace(
    "#/definitions/",
    "",
  ) ?? "";

  const value: IPathVirtualProperty = {
    url,
    method,
    parameters,
    requestHeaders: pathMethod.consumes,
    responseHeaders: pathMethod.produces,
    response,
    summary: pathMethod.summary,
    description: pathMethod.description,
  };

  return value;
};

/**
 * 生成接口地址对象
 * @param paths - 接口地址
 * @returns
 */
export const generatePath = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>,
): Map<string, IPathVirtualProperty> => {
  const pathMap = new Map<string, IPathVirtualProperty>();

  Object.keys(paths).forEach((url) => {
    // 请求方式
    const methods = paths[url];

    Object.keys(methods).forEach((method) => {
      const currentMethod = methods[method];
      // 方法名
      const name = currentMethod.operationId;
      // 接口对象
      const value = getPathVirtualProperty(url, method, currentMethod);

      pathMap.set(name, value);
    });
  });

  return pathMap;
};
