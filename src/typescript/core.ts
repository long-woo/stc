import { caseTitle } from "../util.ts";
import Logs from "../console.ts";
import {
  HttpMethod,
  IDefaultObject,
  IGenerateApiContentParams,
  IGenerateRuntimeApiOptions,
  IGetApiContentParams,
  IRequestParams,
  ISwaggerDefinitionPropertiesItems,
  ISwaggerMethodParameter,
  ISwaggerResultDefinitions,
  propertyType,
} from "../swagger.ts";

// 文件名
let fileName = "";
// 泛型 key 映射
const genericKeyMapping = new Map<string, string>();
// 记录定义内容
const mapDefinitions = new Map<string, string>();

/**
 * 获取定义名称
 * @param ref - 定义参数
 */
const getDefinitionName = (ref?: string) => ref ? `I${ref.slice(14)}` : "";

/**
 * 处理泛型
 * @param name - 定义名称
 * @param isDefintion - 是否为定义
 * @returns
 */
const getGeneric = (name: string, isDefintion?: boolean) => {
  const genericKey = ["T", "K", "U"];
  const keyLength = genericKey.length;

  name = name.replace(/«(.*)?»/g, (_key: string, _value: string) => {
    const arr = _value.split(",").map((t: string, index: number) => {
      const interfaceName = `I${t}`;
      // 自动生成定义名
      let newKey = genericKey[index % keyLength];

      if (index > 2) {
        newKey = newKey + Math.ceil((index - keyLength) / keyLength);
      }

      // key 和定义对象加入映射表
      genericKeyMapping.set(interfaceName, newKey);

      return isDefintion ? newKey : interfaceName;
    });

    return `<${arr.join(", ")}>`;
  });

  return name;
};

/**
 * 生成注释
 * @param comment - 注释描述
 * @param isIndent - 缩进
 * @returns
 */
const generateComment = (comment = "", isIndent = true) => {
  const indent = isIndent ? "\t" : "";

  return comment
    ? `
${indent}/**
${indent} * ${comment}
${indent} */`
    : "";
};

/**
 * 转换为 TypeScript 类型
 * @param type - 属性基础类型
 * @param typeItem - 属性非基础类型
 * @param isDefintion - 是否为泛型定义
 * @returns
 */
const convertType = (
  type: propertyType,
  typeItem?: ISwaggerDefinitionPropertiesItems,
  isDefintion?: boolean,
): string => {
  switch (type) {
    case "integer":
      return "number";
    case "array":
      if (typeItem?.type) {
        const childType = convertType(typeItem.type as propertyType);

        return `${childType}[]`;
      }

      if (typeItem?.$ref) {
        let name = getDefinitionName(typeItem.$ref);

        if (isDefintion) {
          name = genericKeyMapping.get(name) ?? "";
        }
        return `${name}[]`;
      }

      return "[]";
    case "object":
      return "IDefaultObject";
    default:
      // 自定义类型
      if (type.includes("definitions")) {
        let name = getDefinitionName(type);

        // 处理泛型定义类型
        name = isDefintion
          ? genericKeyMapping.get(name) ?? ""
          : getGeneric(name);
        return name;
      }
      return type;
  }
};

/**
 * 获取定义的属性内容
 * @param name - 定义名
 * @param defKey - 定义源中的 key
 * @param defs - 定义源
 * @returns
 */
const getDefinitionContent = (
  name: string,
  defKey: string,
  defs: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const def = defs[defKey.slice(1)];

  if (!def) {
    Logs.warn(`${defKey} 未定义`);
    return "";
  }

  if (def.type === "object") {
    const properties = def.properties;
    const propertiesKeys = Object.keys(properties);

    const res = propertiesKeys.reduce(
      (prev: string[], current: string) => {
        const prop = properties[current];
        const type = convertType(
          (prop.$ref || prop.type) as propertyType,
          prop.items,
          name.includes("<"),
        );
        const content = `${
          generateComment(prop.description)
        }\n\t${current}?: ${type}\n`;

        // 处理自定义的类型
        const customType = prop.$ref || prop.items?.$ref;
        if (customType) {
          const customKey = getDefinitionName(customType);
          const content = generateDefinition(customKey, defs);

          prev.unshift(content);
        }

        prev.splice(prev.length - 1, 0, content);
        return prev;
      },
      [`\nexport interface ${name} {`, "}\n"],
    );

    return res.join("");
  }

  return "";
};

/**
 * 生成定义
 * @param key
 * @param definitions
 * @returns
 */
const generateDefinition = (
  key: string,
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  // 处理 key，可能会存在泛型定义
  const name = getGeneric(key, true);

  if (mapDefinitions.has(name) || !name) return "";
  // 先存储 key，防止递归生成问题
  mapDefinitions.set(name, "");

  const content = getDefinitionContent(name, key, definitions);

  mapDefinitions.set(name, content);
  return content;
};

/**
 * 生成请求参数定义
 * @param parameters - Api 参数信息
 */
const generateParameterDefinition = (
  methodName: string,
  parameters: ISwaggerMethodParameter[] = [],
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const res = parameters.reduce(
    (
      prev: Required<
        IRequestParams<
          { key: string; value: string[] },
          { key: string; value: string }
        >
      >,
      current,
    ) => {
      // 生成 Path
      if (current.in === "path") {
        prev.path = current.name;
      }

      // 生成 Query 对象
      if (current.in === "query") {
        const queryValueLength = prev.query.value.length;
        const queryProp = `${
          generateComment(current.description)
        }\n\t${current.name}${current.required ? "" : "?"}: ${
          convertType(current.type as propertyType)
        }\n`;

        if (!queryValueLength) {
          const queryKey = `IQuery${caseTitle(methodName)}`;

          prev.query = {
            key: queryKey,
            value: [`\nexport interface ${queryKey} {`, "}\n"],
          };
        }

        prev.query.value.splice(queryValueLength - 1, 0, queryProp);
      }

      // 生成 Body 对象
      if (current.in === "body") {
        const ref = current.schema.$ref;
        const key = getDefinitionName(ref);
        const content = generateDefinition(key, definitions);

        prev.body = {
          key,
          value: content,
        };

        if (!content) {
          prev.body = {
            key: "IDefaultObject",
            value: "",
          };
        }
      }

      return prev;
    },
    {
      path: "",
      query: {
        key: "",
        value: [],
      },
      body: { key: "", value: "" },
    },
  );

  return res;
};

/**
 * 拼接请求参数
 * @param params - 请求的参数
 * @returns
 */
const getRequestParams = (
  params: IRequestParams<string, string, string>,
) => {
  const { path, query, body } = params;
  const req: string[] = [];
  const use: string[] = [];

  if (path) {
    req.push(`${path}: string`);
    use.splice(use.length - 1, 0, `path: ${path}`);
  }

  if (query) {
    req.push(`params: ${query}`);
    use.splice(use.length - 1, 0, `query: params`);
  }

  if (body) {
    req.push(`data: ${body}`);
    use.splice(use.length - 1, 0, `body: data`);
  }

  return {
    req: req.join(", "),
    use: use.length ? `, { ${use.join(", ")} }` : "",
  };
};

/**
 * 生成运行时 Api 函数
 * @param options - Api 信息
 */
const generateRuntimeFunction = (
  options: IGenerateRuntimeApiOptions,
) => {
  const { req, use } = getRequestParams(options.params || {});

  const res = `${generateComment(options.comment, false)}
export const ${options.name} = (${req ??
    ""}) => webClient.${options.method}<${options
    .responseKey || "void"}>('${options.url}'${use ?? ""})
`;

  return res;
};

/**
 * 生成 Api 内容（请求参数、响应体、方法定义）
 * @param params - 参数
 *
 * `url` - 请求地址
 *
 * `methodName` -方法名字
 *
 * `method` - 请求方式
 *
 * `methodOption` - 方法所需参数
 *
 * `definitions` - 定义的对象
 *
 * @returns
 */
const generateApiContent = (
  { url, methodName, method, methodOption, definitions }:
    IGenerateApiContentParams,
) => {
  const def: string[] = [];
  const func: string[] = [];

  // 请求对象
  const params = generateParameterDefinition(
    methodName,
    methodOption.parameters,
    definitions,
  );
  const paramQuery = params.query;
  const paramBody = params.body;
  def.push(paramQuery?.value.join(""), paramBody?.value);

  // 响应对象
  const responseRef = methodOption.responses[200].schema?.$ref;
  const responseKey = getDefinitionName(responseRef);
  const response = generateDefinition(responseKey, definitions);
  def.push(response);

  // 运行时方法
  const runtimeFunc = generateRuntimeFunction({
    name: methodName,
    url,
    method,
    params: {
      path: params.path,
      query: paramQuery?.key,
      body: paramBody?.key,
    },
    responseKey,
    comment: methodOption.summary,
  });
  func.push(runtimeFunc);

  return {
    def,
    func,
  };
};

/**
 * 获取 Api 内容
 * @param params - 参数
 * @returns
 */
export const getApiContent = (params: IGetApiContentParams) => {
  const methodKeys = Object.keys(params.methods);

  // 如果不是同一文件名，需要清除记录的声明
  if (fileName !== params.fileName) {
    genericKeyMapping.clear();
    mapDefinitions.clear();
  }

  fileName = params.fileName;

  const data = methodKeys.reduce(
    (prev: { def: string[]; func: string[] }, current: string) => {
      const methodOption = params.methods[current];
      let methodName = params.urlSplit[3] ?? params.urlSplit[2];

      // 若同一个地址下存在多个请求方法
      if (methodKeys.length > 1) {
        methodName = current + caseTitle(methodName);
      }

      const res = generateApiContent({
        url: params.url,
        method: current as HttpMethod,
        methodName,
        methodOption,
        definitions: params.definitions,
      });

      prev.def.push(...res.def);
      prev.func.push(...res.func);
      return prev;
    },
    { def: [], func: [] },
  );

  return data;
};
