import { caseTitle, copyFile, createFile, getDefinitionName } from "./util.ts";
import Logs from "../console.ts";
import {
  HttpMethod,
  IDefaultObject,
  IGenerateRuntimeApiOptions,
  IRequestParams,
  ISwaggerDefinitionPropertiesItems,
  ISwaggerMethodParameter,
  ISwaggerResult,
  ISwaggerResultDefinitions,
  propertyType,
} from "../swagger.ts";

// 记录定义内容
const mapDefinitions = new Map<string, string>();

/**
 * 转换为 TypeScript 类型
 * @param type - 属性基础类型
 * @param typeItem - 属性非基础类型
 * @returns
 */
const convertType = (
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
 * 获取定义的属性内容
 * @param name - 定义名
 * @param defs - 定义源
 * @returns
 */
const getDefinitionContent = (
  name: string,
  defs: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const def = defs[name.slice(1)] ?? {};

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
const generateDefinition = (
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
const getRequestParams = (params: IRequestParams<string, string, string>) => {
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
const generateRuntimeFunction = (options: IGenerateRuntimeApiOptions) => {
  const { req, use } = getRequestParams(options.params || {});

  const res = `${generateComment(options.comment, false)}
export const ${options.name} = (${req ??
    ""}) => webClient.${options.method}<${options
    .responseKey || "void"}>('${options.url}'${use ?? ""})
`;

  return res;
};

/**
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns
 */
const getSwaggerData = async (urlOrPath: string) => {
  // 从远程地址获取 Swagger 数据
  const res = await fetch(urlOrPath);
  const data: ISwaggerResult = await res.json();

  return data;
};

/**
 * 生成 Api
 * @param urlOrPath 远程地址或本地
 * @param outDir 输出路径
 */
export const generateApi = async (urlOrPath: string, outDir: string) => {
  const data = await getSwaggerData(urlOrPath);

  const paths = data.paths;
  const definitions = data.definitions;

  // 清空控制台信息
  Logs.clear();

  // 遍历所有 API 路径
  for (const key of Object.keys(paths)) {
    // if (key !== "/api/dataOperation/save") continue;
    mapDefinitions.clear();
    Logs.info(`${key} 接口生成中...`);

    const pathKeys = key.split("/");

    // 文件名。取之 API 路径第二个
    const fileName = `${pathKeys[2]}.ts`;
    const outPath = `${outDir}/${fileName}`;

    // 文件内容
    let content = `import { webClient } from './shared/fetch.ts'
import { IDefaultObject } from './shared/interface.ts'
`;

    // 当前 API 的所有方法
    const methods = paths[key];
    const methodKeys = Object.keys(methods);

    // 遍历当前 API 方法
    for (const methodKey of methodKeys) {
      const methodOption = methods[methodKey];
      let methodName = pathKeys[3] ?? pathKeys[2];

      // 若同一个地址下存在多个请求方法
      if (methodKeys.length > 1) {
        methodName = methodKey + caseTitle(methodName);
      }

      // 请求对象
      const params = generateParameterDefinition(
        methodName,
        methodOption.parameters,
        definitions,
      );
      const paramQuery = params.query;
      const paramBody = params.body;
      content += paramQuery?.value.join("");
      content += paramBody?.value;

      // 响应对象
      const responseRef = methodOption.responses[200].schema?.$ref;
      const responseKey = getDefinitionName(responseRef);
      content += generateDefinition(responseKey, definitions);

      content += generateRuntimeFunction({
        name: methodName,
        url: key,
        method: methodKey as HttpMethod,
        params: {
          path: params.path,
          query: paramQuery?.key,
          body: paramBody?.key,
        },
        responseKey,
        comment: methodOption.summary,
      });
    }

    // 复制运行时需要的文件
    copyFile("./src/typescript/shared", `${outDir}/shared`);

    // 创建文件
    await createFile(outPath, content);
    Logs.success("完成。\n");
  }
};
