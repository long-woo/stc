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
// 关键字变量
const keywordVariable = ["get", "post", "head", "put", "options", "delete"];
// 泛型 key 映射
const genericKeyMapping = new Map<string, string>();
// 记录定义内容
const mapDefinitions = new Map<string, string>();
let methodNameDefinitions: string[] = [];

/**
 * 获取定义名称
 * @param ref - 定义参数
 */
const getDefinitionName = (ref?: string) => ref ? `I${ref.slice(14)}` : "";

/**
 * 从 url 中获取方法名
 * @param urlSplit - url
 * @param prefix - 前缀
 */
const getMethodName = (urlSplit: string[], prefix: string) => {
  const regName = /[\{|:](\w+)[\}]?/gi;
  let methodIndex = 0;

  urlSplit = [...urlSplit].reverse();
  let name = urlSplit.find((item, index) => {
    if (methodNameDefinitions.includes(item)) {
      methodIndex = index + 1;
    }

    return !regName.test(item);
  }) ?? "";

  if (methodNameDefinitions.includes(name)) {
    name += caseTitle(urlSplit[methodIndex]);
  }

  // 加前缀
  if (prefix) {
    name = prefix + caseTitle(name);
  }

  // 处理方法名中特殊字符
  name = name.replace(
    /[\-|_](\w)/g,
    (_key: string, _value: string) => _value.toUpperCase(),
  );

  // 处理方法名字是关键字变量
  if (keywordVariable.includes(name)) {
    name += caseTitle(urlSplit[2]);
  }

  methodNameDefinitions.push(name);
  return name;
};

/**
 * 处理泛型
 * @param name - 定义名称
 * @param isDefinition - 是否为定义
 * @returns
 */
const getGeneric = (name: string, isDefinition?: boolean) => {
  const genericKey = ["T", "K", "U"];
  const keyLength = genericKey.length;

  name = name.replace(/«(.*)?»/g, (_key: string, _value: string) => {
    const str = getGeneric(_value, isDefinition);

    const arr = str.split(/,\s*/g).map((t: string, index: number) => {
      const interfaceName = `I${t}`;
      // 自动生成定义名
      let newKey = genericKey[index % keyLength];

      if (index > keyLength - 1) {
        newKey = newKey + Math.ceil((index - keyLength) / keyLength);
      }

      // key 和定义对象加入映射表
      genericKeyMapping.set(interfaceName, newKey);

      return isDefinition ? newKey : interfaceName;
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
 * @param defKey - 定义源中的 key
 * @returns
 */
const convertType = (
  type: propertyType,
  typeItem?: ISwaggerDefinitionPropertiesItems,
  defKey?: string,
): string => {
  const isDefinition = defKey?.includes("«");

  switch (type) {
    case "integer":
      return "number";
    case "array":
      if (typeItem?.type) {
        const childType = convertType(typeItem.type as propertyType);

        return `${childType}[]`;
      }

      if (typeItem?.$ref) {
        const name = getDefinitionName(typeItem.$ref);
        const value = `${name}[]`;

        if (defKey) {
          genericKeyMapping.set(defKey, value);
        }

        return isDefinition ? genericKeyMapping.get(name) ?? "" : value;
      }

      return "[]";
    case "object": {
      let name = "IDefaultObject";

      if (defKey && isDefinition) {
        getGeneric(defKey);
        genericKeyMapping.set(defKey, name);

        name = genericKeyMapping.get("Iobject") ?? "";
      }

      return name;
    }
    default:
      // 自定义类型
      if (type.includes("definitions")) {
        let name = getDefinitionName(type);
        const value = getGeneric(name);

        if (defKey) {
          genericKeyMapping.set(defKey, value);
        }

        // 处理泛型定义类型
        name = isDefinition ? genericKeyMapping.get(name) ?? "" : value;
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
    const initContent = mapDefinitions.has(name)
      ? []
      : [`\nexport interface ${name} {`, "}\n"];
    console.log(initContent);

    const res = propertiesKeys.reduce(
      (prev: string[], current: string) => {
        const prop = properties[current];
        const type = convertType(
          (prop.$ref || prop.type) as propertyType,
          prop.items,
          defKey,
        );
        const content = `${
          generateComment(prop.description)
        }\n\t${current}?: ${type}\n`;

        // 处理自定义的类型
        const customType = prop.$ref || prop.items?.$ref;
        if (customType) {
          const customKey = getDefinitionName(customType);

          if (!mapDefinitions.has(customKey)) {
            const { content } = generateDefinition(customKey, defs);

            prev.unshift(content);
          }
        }

        if (name === "IApiResponse<T>") {
          console.log(content);
        }

        if (prev.length) {
          prev.splice(prev.length - 1, 0, content);
        }

        // 如果定义的对象已经有值，同一文件不能重复定义
        if (!mapDefinitions.has(name)) {
          mapDefinitions.set(name, prev.join(""));
        }
        return prev;
      },
      initContent,
    );

    return res.join("");
  }

  return "";
};

/**
 * 生成定义
 * @param key - 定义源中的 key
 * @param defs - 定义源
 * @returns
 */
const generateDefinition = (
  key: string,
  defs: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const name = getGeneric(key, true);
  const content = getDefinitionContent(name, key, defs);

  return {
    name,
    content,
  };
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
        const { content } = generateDefinition(key, definitions);

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
 * 生成响应对象
 * @param key - 响应对象的 key
 * @param defs - 定义源
 */
const generateResponseDefinition = (
  ref: string,
  defs: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  let key = getDefinitionName(ref);
  const { name, content } = generateDefinition(key, defs);
  const oldName = genericKeyMapping.get(key);

  key = name.replace(/<(\w+)?>/gi, `<${oldName}>`);

  return {
    name: key,
    content,
  };
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
    ""}) =>
\twebClient.${options.method}<${options
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
  const responseRef = methodOption.responses[200].schema?.$ref ?? "";
  const response = generateResponseDefinition(responseRef, definitions);
  def.push(response.content);

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
    responseKey: response.name,
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
    methodNameDefinitions = [];
  }

  fileName = params.fileName;

  const data = methodKeys.reduce(
    (prev: { def: string[]; func: string[] }, current: string) => {
      const methodOption = params.methods[current];

      // 如果同一地址，自动添加方法名前缀
      const methodNamePrefix = methodKeys.length > 1 ? current : "";
      const methodName = getMethodName(params.urlSplit, methodNamePrefix);

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
