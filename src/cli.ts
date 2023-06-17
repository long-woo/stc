import { dirname, fromFileUrl, join } from "std/path/mod.ts";

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
import { copyFile, createFile, emptyDirectory, readFile } from "./util.ts";
import { IPluginContext } from "./plugins/typeDeclaration.ts";

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
  console.log("\n");
  Logs.success(`api 已生成完成：\n\t${options.outDir}\n`);
};

export const generateApi = async (
  context: IPluginContext,
  urlOrPath: string,
  options: ISwaggerOptions,
) => {
  const data = await getSwaggerData(urlOrPath);

  context.onLoad?.(data);
  await emptyDirectory(options.outDir);

  // 复制运行时需要的文件
  copyFile(
    join(dirname(fromFileUrl(import.meta.url)), "/typescript/shared"),
    `${options.outDir}/shared`,
  );

  // 生成 v2 类型定义文件
  if (data.definitions) {
    generateDefFile(data.definitions, options);
  }
  // 生成 v3 类型定义文件
  if (data.components?.schemas) {
    generateDefFile(data.components?.schemas, options);
  }

  generateApiMethodFile(data.paths, options);
};
