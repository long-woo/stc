import { copy, ensureFile } from "https://deno.land/std@0.106.0/fs/mod.ts";

import Logs from "../console.ts";
import {
  HttpMethod,
  IDefaultObject,
  IGenerateRuntimeApiOptions,
  IRequestParams,
  ISwaggerDefinitionPropertieItems,
  ISwaggerMethodParameter,
  ISwaggerResult,
  ISwaggerResultDefinitions,
  propertyType,
} from "../swagger.ts";

// 记录定义内容
const mapDefinitions = new Map<string, string>();

/**
 * 获取定义名称
 * @param ref - 定义参数
 */
const getDefinitionName = (ref?: string) => ref ? `I${ref.slice(14)}` : "";

/**
 * 首字母大写
 * @param str - 字符
 * @returns
 */
const caseTitle = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * 创建文件。如果不存在会被自动创建，存在会被覆盖
 *
 * @param filePath - 文件路径
 * @param content - 文件内容
 */
const createFile = async (filePath: string, content: string) => {
  await ensureFile(filePath);
  await Deno.writeFile(
    filePath,
    new TextEncoder().encode(`// 由 swagger2code 生成\n${content}`),
  );
};

/**
 * 覆盖复制文件
 * @param from - 复制位置
 * @param to - 目标位置
 */
const copyFile = (from: string, to: string) => {
  copy(from, to, { overwrite: true });
};

/**
 * 转换为 TypeScript 类型
 * @param type - 属性基础类型
 * @param typeItem - 属性非基础类型
 * @returns
 */
const convertType = (
  type: propertyType,
  typeItem?: ISwaggerDefinitionPropertieItems,
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
 * @returns
 */
const generateComment = (comment?: string) => {
  return comment
    ? `\n\t/**
   * ${comment}
   */`
    : "";
};

const getDefinitionContent = (
  name: string,
  defs: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const def = defs[name.slice(1)];

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
        const customType = prop.$ref || prop.items?.$ref;

        // 处理自定义的类型
        if (customType) {
          const customKey = getDefinitionName(customType);
          const content = generateDefinition(customKey, defs);

          prev.unshift(content);
        }

        prev.splice(
          prev.length - 1,
          0,
          `${generateComment(prop.description)}
\t${current}: ${type}\n`,
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
  const queryKey = `IQuery${caseTitle(methodName)}`;
  const queryValue = [];

  const res = parameters.reduce(
    (
      prev: IRequestParams<
        { key: string; value: string[] },
        { key: string; value: string }
      >,
      current,
    ) => {
      // 生成 Path
      if (current.in === "path") {
        prev.path = current.name;
      }

      // 生成 Query 对象
      if (current.in === "query" && prev.query?.value) {
        const queryProp = `${
          generateComment(current.description)
        }\n\t${current.name}${current.required ? "" : "?"}: ${
          convertType(current.type as propertyType)
        }\n`;

        prev.query.value.splice(prev.query.value.length - 1, 0, queryProp);
      }

      // 生成 Body 对象
      if (current.in === "body" && prev.body) {
        const ref = current.schema.$ref;
        const key = getDefinitionName(ref);

        prev.body.key = key;
        prev.body.value = generateDefinition(key, definitions);
      }

      return prev;
    },
    {
      path: "",
      query: {
        key: queryKey,
        value: [`\nexport interface ${queryKey} {`, "}\n"],
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
    use: `, { ${use.join(", ")} }`,
  };
};

/**
 * 生成运行时 Api
 * @param options - Api 信息
 */
const generateRuntimeApi = (options: IGenerateRuntimeApiOptions) => {
  const { req, use } = getRequestParams(options.params || {});

  const res = `
export const ${options.name} = (
  ${req ?? ""}
) => webClient.${options.method}<${options
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
    if (key !== "/api/applyTrial") continue;
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
      console.log(methodName);
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

      content += generateRuntimeApi({
        name: methodName,
        url: key,
        method: methodKey as HttpMethod,
        params: {
          path: params.path,
          query: paramQuery?.key,
          body: paramBody?.key,
        },
        responseKey,
      });
    }

    // 复制运行时需要的文件
    copyFile("./src/typescript/shared", `${outDir}/shared`);

    // 创建文件
    await createFile(outPath, content);
    Logs.success("完成。\n");
  }
};
