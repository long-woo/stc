import Logs from "../console.ts";
import { caseTitle, copyFile, createFile } from "../util.ts";
import { HttpMethod, ISwaggerResult } from "../swagger.ts";

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
    if (key !== "/api/dataOperation/exportList") continue;
    // mapDefinitions.clear();
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
