import { parse } from "https://deno.land/std@0.106.0/flags/mod.ts";

import Logs from "./console.ts";
import { getDefinition } from "./definition.ts";
import { getApiPath } from "./path.ts";
import { getSecurityDefinition } from "./security.ts";
import { ISwaggerResult } from "./swagger.ts";
import { parserDefinition } from "./typescript/defintion.ts";
import { parserPath } from "./typescript/path.ts";

const main = () => {
  // 解析参数
  const args = parse(Deno.args);

  // 文件输出目录，默认为 Deno 当前执行的目录
  let outDir = Deno.cwd();

  // 若没有提供 out 选项，则使用 Deno 当前执行的目录
  if (typeof args.out === "string" && args.out) {
    outDir = args.out;
  }

  return {
    outDir,
  };
};

/**
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns
 */
const getSwaggerData = async (urlOrPath: string): Promise<ISwaggerResult> => {
  // 从远程地址获取 Swagger 数据
  const res = await fetch(urlOrPath);
  const data = await res.json();

  return data;
};

const generateApi = async (urlOrPath: string, outDir: string) => {
  const data = await getSwaggerData(urlOrPath);

  // 清空控制台信息
  Logs.clear();

  // 复制运行时需要的文件
  // copyFile("./src/typescript/shared", `${outDir}/shared`);

  // 生成定义
  const defVirtual = getDefinition(data.definitions);
  // 生成路径
  const pathVirtual = getApiPath(data.paths);
  // 授权、请求头
  const securityVirtual = getSecurityDefinition(data.securityDefinitions);
  // console.log(securityVirtual);
  // parserDefinition(defVirtual);
  parserPath(pathVirtual);
};

if (import.meta.main) {
  const { outDir } = main();

  // http://demodata.liangyihui.net/smart/v2/api-docs
  // https://petstore.swagger.io/v2/swagger.json
  generateApi("https://petstore.swagger.io/v2/swagger.json", outDir);
}
