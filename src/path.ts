import {
  IDefaultObject,
  IPathVirtualParameter,
  IPathVirtualParameterCategory,
  IPathVirtualProperty,
  ISwaggerContent,
  ISwaggerResultPath,
} from "./swagger.ts";
import { getRefType, lowerCase } from "./util.ts";

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
  // 请求参数 path、query、body、formData、header
  const parameters =
    (pathMethod.parameters?.sort((_a, _b) =>
      Number(_b.required) - Number(_a.required)
    ) ?? []).reduce((prev: IPathVirtualParameter, current) => {
      const item: IPathVirtualParameterCategory = {
        name: current.name,
        type: current.type ?? current.schema?.type ?? "",
        required: current.required,
        description: current.description,
        format: current.format ?? current.schema?.format,
        ref: getRefType(
          current.schema?.$ref ?? current.schema?.items?.$ref ??
            current.schema?.items?.type ?? "",
        ),
      };

      prev[current.in].push(item);

      return prev;
    }, { path: [], query: [], body: [], formData: [], header: [] });

  // v3 body 参数在 requestBody
  const _requestBody = pathMethod.requestBody;
  if (_requestBody) {
    Object.keys(_requestBody.content).forEach((_key) => {
      if (["application/json", "application/octet-stream"].includes(_key)) {
        const _bodyContent =
          _requestBody.content[_key as keyof ISwaggerContent];
        const _bodyContentRef = getRefType(
          _bodyContent?.schema?.$ref ?? _bodyContent?.schema?.items?.$ref ?? "",
        );
        const _body: IPathVirtualParameterCategory = {
          name: lowerCase(_bodyContentRef),
          type: _bodyContent?.schema?.type ?? "",
          required: _requestBody.required ?? false,
          description: _requestBody.description,
          ref: _bodyContentRef,
        };

        parameters.body.push(_body);
      }
    });
  }

  // 响应
  const _resSchema = pathMethod.responses[200]?.schema ??
    pathMethod.responses[200]?.content?.["application/json"]?.schema;

  const value: IPathVirtualProperty = {
    url,
    method,
    parameters,
    requestHeaders: pathMethod.consumes,
    responseHeaders: pathMethod.produces,
    response: {
      ref: getRefType(_resSchema?.$ref ?? _resSchema?.items?.$ref ?? ""),
      type: _resSchema?.type,
    },
    summary: pathMethod.summary,
    description: pathMethod.description,
    tags: pathMethod.tags,
  };

  return value;
};

/**
 * 获取接口地址对象
 * @param paths - 接口地址
 * @returns
 */
export const getApiPath = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>,
): Map<string, IPathVirtualProperty> => {
  const pathMap = new Map<string, IPathVirtualProperty>();

  Object.keys(paths).forEach((url) => {
    if (
      url !== "/pet/{petId}"
      // !url.includes("/pet")
      // !["/api/project/saveFormDataByPatient"].includes(url)
    ) {
      return;
    }
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
