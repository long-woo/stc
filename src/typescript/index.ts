import Logs from "../console.ts";
import { copyFile, createFile } from "../util.ts";
import { ISwaggerResult } from "../swagger.ts";
import { getApiContent } from "./core.ts";

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
 * 输出文件
 * @param fileMap - 文件集合
 * @param outDir - 输出目录
 */
const outFile = async (fileMap: Map<string, string[]>, outDir: string) => {
  console.log("\n");
  Logs.info("接口生成完成，准备写入文件...");

  for (const [fileName, value] of fileMap) {
    const outPath = `${outDir}/${fileName}`;

    // 文件内容
    const content = `import { webClient } from './shared/fetch.ts'
import { IDefaultObject } from './shared/interface.ts'
${value.join("")}`;

    // 创建文件
    await createFile(outPath, content);
  }

  Logs.success("完成。\n");
};

/**
 * 生成 Api
 * @param urlOrPath 远程地址或本地
 * @param outDir 输出路径
 */
export const generateApi = async (urlOrPath: string, outDir: string) => {
  const fileMap = new Map<string, string[]>();
  const defMap = new Map<string, string[]>();
  const funcMap = new Map<string, string[]>();

  const data = await getSwaggerData(urlOrPath);

  const paths = data.paths;
  const definitions = data.definitions;

  // 清空控制台信息
  Logs.clear();

  // 复制运行时需要的文件
  copyFile("./src/typescript/shared", `${outDir}/shared`);

  // 遍历所有 API 路径
  for (const url of Object.keys(paths)) {
    if (url !== "/api/dataManagement/queryDataHistory") continue;
    Logs.info(`${url} 接口生成中...`);

    // 当前 API 的所有方法
    const methods = paths[url];

    // 拆分后的 url。用于文件名、请求参数和方法名定义
    const urlSplit = url.split("/");

    // 文件名。取之 API 路径第二个
    const fileName = `${urlSplit[2]}.ts`;

    // 获取定义
    const def = defMap.get(fileName) ?? [];
    // 获取函数
    const func = funcMap.get(fileName) ?? [];

    // 处理文件内容
    const res = getApiContent({
      fileName,
      url,
      urlSplit,
      methods,
      definitions,
    });

    defMap.set(fileName, [...def, ...res.def]);
    funcMap.set(fileName, [...func, ...res.func]);
    fileMap.set(fileName, [
      ...(defMap.get(fileName) ?? []),
      ...(funcMap.get(fileName) ?? []),
    ]);
  }

  outFile(fileMap, outDir);
};
