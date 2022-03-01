import { parse } from "https://deno.land/std@0.106.0/flags/mod.ts";

import Logs from "./console.ts";
import { generateDefinition } from "./definition.ts";
import { ISwaggerResult } from "./swagger.ts";

const main = () => {
  // 解析参数
  const args = parse(Deno.args);

  // 文件输出目录，默认为 Deno 当前执行的目录
  let outDir = Deno.cwd();

  // 检查 lang 选项
  if (typeof args.lang !== "string" || !args.lang) {
    Logs.error("必须提供 --lang 选项。");
    Deno.exit();
  }

  // 若没有提供 out 选项，则使用 Deno 当前执行的目录
  if (typeof args.out === "string" && args.out) {
    outDir = args.out;
  }

  return {
    lang: args.lang,
    outDir,
  };
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

const generateApi = async (urlOrPath: string, outDir: string) => {
  // const fileMap = new Map<string, string[]>();
  // const defMap = new Map<string, string[]>();
  // const funcMap = new Map<string, string[]>();

  const data = await getSwaggerData(urlOrPath);

  const paths = data.paths;
  const definitions = data.definitions;

  // 清空控制台信息
  Logs.clear();

  // 复制运行时需要的文件
  // copyFile("./src/typescript/shared", `${outDir}/shared`);

  // 生成定义
  generateDefinition(definitions);
};

if (import.meta.main) {
  const { lang, outDir } = main();

  // http://demodata.liangyihui.net/smart/v2/api-docs
  // https://petstore.swagger.io/v2/swagger.json
  generateApi("https://petstore.swagger.io/v2/swagger.json", outDir);
}
