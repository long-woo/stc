import { Args, parse } from "std/flags/mod.ts";

import Logs from "./console.ts";
import { getDefinition } from "./definition.ts";
import { getApiPath } from "./path.ts";
import { ISwaggerOptions, ISwaggerResult } from "./swagger.ts";
import { createFile, emptyDirectory, readFile } from "./util.ts";
import { IPluginContext } from "./plugins/typeDeclaration.ts";

/**
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns
 */
const getData = async (urlOrPath: string): Promise<ISwaggerResult> => {
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

/**
 * 启动
 * @param context - 插件上下文
 * @param urlOrPath - url 或本地文件路径
 * @param options - 配置
 */
export const start = async (
  context: IPluginContext,
  urlOrPath: string,
  options: ISwaggerOptions,
) => {
  const data = await getData(urlOrPath);
  // 触发插件 onload 事件
  context.onLoad?.(data);

  // 处理类型定义。v2 版本中，通过 `definitions` 属性获取。而 v3 版本，则通过 `components.schemas` 属性获取。
  const defData = getDefinition(data.definitions || data.components?.schemas);
  // 触发插件 onDefinition 事件
  context.onDefinition?.(defData);

  const actionData = getApiPath(data.paths);
  // 触发插件 onAction 事件
  context.onAction?.(actionData);

  // 清空输出目录
  await emptyDirectory(options.outDir);

  // 触发插件 onTransform 事件
  const transformData = context.onTransform?.(defData, actionData);

  // 写入类型定义文件
  if (transformData?.definition) {
    createFile(
      `${options.outDir}/types.${options.lang}`,
      transformData.definition,
    );
  }

  // 写入 API 文件
  if (transformData?.action) {
    transformData.action.forEach((content, filename) => {
      createFile(
        `${options.outDir}/${filename}.${options.lang}`,
        content,
      );
    });
  }

  console.log("\n");
  Logs.success(`API 文件生成完成：\n\t${options.outDir}\n`);
  // 触发插件 onEnd 事件
  context.onEnd?.();
};

const printHelp = () => {
  console.log(`
Usage:
  swagger2code [options] <url>

Options:
  -h, --help         显示帮助信息
  -o, --outDir       输出目录，默认为 Deno 当前执行的目录下 swagger2code_out
  -p, --platform     平台，可选值：axios、wechat， [default: "axios"]
  -l, --lang         语言，用于输出文件的后缀名， [default: "ts"]
  -v, --version      显示版本信息

Examples:
  swagger2code -o./out http://petstore.swagger.io/v2/swagger.json
  swagger2code -o./out -p wechat -l ts http://petstore.swagger.io/v2/swagger.json
`);
  Deno.exit(0);
};

export const main = (): ISwaggerOptions => {
  // 定义命令行参数和选项的配置
  const argsConfig = {
    boolean: ["help"],
    string: ["outDir", "platform", "lang", "version"],
    alias: {
      h: "help",
      o: "outDir",
      p: "platform",
      l: "lang",
      v: "version",
    },
    default: {
      lang: "ts",
      platform: "axios",
    },
    unknown: (arg: string) => {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      Deno.exit(1);
    },
  };

  // 解析命令行参数和选项
  const args: Args = parse(Deno.args, argsConfig);

  // 文件输出目录，默认为 Deno 当前执行的目录
  let outDir = `${Deno.cwd()}/swagger2code_out`;

  // 若没有提供 out 选项，则使用 Deno 当前执行的目录
  if (typeof args.outDir === "string" && args.outDir) {
    outDir = args.outDir;
  }

  // 平台。axios、wechat
  const platform = args.platform ?? "axios";
  // 语言，用于输出文件的后缀名。默认：ts
  const lang = args.lang ?? "ts";

  return {
    url: args.url,
    outDir,
    platform,
    lang,
  };
};
