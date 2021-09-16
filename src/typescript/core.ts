import { caseTitle } from "../util.ts";
import Logs from "../console.ts";
import {
  IDefaultObject,
  IGenerateRuntimeApiOptions,
  IRequestParams,
  ISwaggerDefinitionPropertiesItems,
  ISwaggerMethodParameter,
  ISwaggerResultDefinitions,
  propertyType,
} from "../swagger.ts";

// 记录定义内容
const mapDefinitions = new Map<string, string>();

/**
 * 获取定义名称
 * @param ref - 定义参数
 */
export const getDefinitionName = (ref?: string) =>
  ref ? `I${ref.slice(14)}` : "";

/**
 * 生成注释
 * @param comment - 注释描述
 * @param isIndent - 缩进
 * @returns
 */
export const generateComment = (comment = "", isIndent = true) => {
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
 * @returns
 */
export const convertType = (
  type: propertyType,
  typeItem?: ISwaggerDefinitionPropertiesItems,
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
        const key = getDefinitionName(typeItem.$ref);

        return `${key}[]`;
      }

      return "[]";
    case "object":
      return "IDefaultObject";
    default:
      return type;
  }
};

/**
 * 获取定义的属性内容
 * @param name - 定义名
 * @param defs - 定义源
 * @returns
 */
export const getDefinitionContent = (
  name: string,
  defs: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const def = defs[name.slice(1)];

  if (!def) {
    Logs.warn(`${name} 未定义`);
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
        );

        // 处理自定义的类型
        const customType = prop.$ref || prop.items?.$ref;
        if (customType) {
          const customKey = getDefinitionName(customType);
          const content = generateDefinition(customKey, defs);

          prev.unshift(content);
        }

        prev.splice(
          prev.length - 1,
          0,
          `${generateComment(prop.description)}
\t${current}?: ${type}\n`,
        );

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
export const generateDefinition = (
  key: string,
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  if (mapDefinitions.has(key) || !key) return "";
  // 首先把 key 存储到 Map 对象中，防止在
  mapDefinitions.set(key, "");

  const content = getDefinitionContent(key, definitions);

  mapDefinitions.set(key, content);
  return content;
};

/**
 * 生成请求参数定义
 * @param parameters - Api 参数信息
 */
export const generateParameterDefinition = (
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
export const getRequestParams = (
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
export const generateRuntimeFunction = (
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
