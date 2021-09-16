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
  for (const url of Object.keys(paths)) {
    if (url !== "/api/dataOperation/exportList") continue;
    // mapDefinitions.clear();
    Logs.info(`${url} 接口生成中...`);

    // 当前 API 的所有方法
    const methods = paths[url];

    // 拆分后的 url。用于文件名、请求参数和方法名定义
    const urlSplit = url.split("/");

    // 文件名。取之 API 路径第二个
    const fileName = `${urlSplit[2]}.ts`;
    const outPath = `${outDir}/${fileName}`;

    // 文件内容
    let content = `import { webClient } from './shared/fetch.ts'
import { IDefaultObject } from './shared/interface.ts'
`;

    // 处理文件内容
    content += getApiContent({ url, urlSplit, methods, definitions });

    // 复制运行时需要的文件
    copyFile("./src/typescript/shared", `${outDir}/shared`);

    // 创建文件
    await createFile(outPath, content);
    Logs.success("完成。\n");
  }
};
