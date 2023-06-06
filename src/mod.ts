import { parse } from "std/flags/mod.ts";

import Logs from "./console.ts";
import { getDefinition } from "./definition.ts";
import { getApiPath } from "./path.ts";
import {
  IDefaultObject,
  ISwaggerOptions,
  ISwaggerResult,
  ISwaggerResultDefinition,
  ISwaggerResultPath,
} from "./swagger.ts";
import { parserDefinition } from "./typescript/defintion.ts";
import { parserPath } from "./typescript/path.ts";
import { copyFile, createFile, emptyDirectory, readFile } from "./util.ts";

const main = (): ISwaggerOptions => {
  // 解析参数
  const args = parse(Deno.args);

  // 文件输出目录，默认为 Deno 当前执行的目录
  let outDir = Deno.cwd();

  // 若没有提供 out 选项，则使用 Deno 当前执行的目录
  if (typeof args.outDir === "string" && args.outDir) {
    outDir = args.outDir;
  }

  // 平台。axios、wechat
  const platform = args.platform ?? "axios";

  return {
    url: args.url,
    outDir,
    platform,
  };
};

/**
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns
 */
const getSwaggerData = async (urlOrPath: string): Promise<ISwaggerResult> => {
  if (!/^http(s?):\/\//.test(urlOrPath)) {
    const content = await readFile(urlOrPath);

    try {
      return JSON.parse(content) as unknown as ISwaggerResult;
    } catch (error) {
      throw new Error(`api 文件解析失败。原因：${error}`);
    }
  }

  // 从远程地址获取 Swagger 数据
  const res = await fetch(urlOrPath);
  const data = await res.json();

  return data;
};

const generateDefFile = (
  definitions: IDefaultObject<ISwaggerResultDefinition>,
  options: ISwaggerOptions,
) => {
  Logs.info("处理类型定义...");
  const defVirtual = getDefinition(definitions);
  const defFileContent = parserDefinition(defVirtual);

  createFile(`${options.outDir}/types.ts`, defFileContent);
  Logs.info("处理类型定义完成。\n");
};

const generateApiMethodFile = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>,
  options: ISwaggerOptions,
) => {
  Logs.info("处理 api...");
  const pathVirtual = getApiPath(paths);
  const pathData = parserPath(pathVirtual);
  pathData.forEach((api, key) => {
    const _import = api.import;
    const _apiImport = [
      `import webClient from './shared/${options.platform}/fetch'`,
    ];
    const _apiContent: Array<string> = [];

    if (_import.length) {
      _apiImport.push(
        `import type { ${_import.join(", ")} } from './types'`,
      );
    }

    _apiContent.push(_apiImport.join("\n"));
    api.interface?.length && _apiContent.push(api.interface?.join("\n\n"));
    api.export?.length && _apiContent.push(api.export.join("\n\n"));

    createFile(`${options.outDir}/${key}.ts`, _apiContent.join("\n\n"));
  });
  Logs.info("处理 api 完成。\n");
};

const generateApi = async (urlOrPath: string, options: ISwaggerOptions) => {
  const data = await getSwaggerData(urlOrPath);

  // 清空控制台信息
  Logs.clear();
  await emptyDirectory(options.outDir);

  // 复制运行时需要的文件
  // copyFile(
  //   `./src/typescript/shared`,
  //   `${options.outDir}/shared`,
  // );

  generateDefFile(data.definitions, options);
  generateApiMethodFile(data.paths, options);
};

if (import.meta.main) {
  const options = main();

  // http://demodata.liangyihui.net/smart/v2/api-docs
  // https://petstore.swagger.io/v2/swagger.json
  generateApi(options.url, options);
}
