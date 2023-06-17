import { parse } from "std/flags/mod.ts";

import Logs from "./console.ts";
import { PluginManager } from "./plugins/index.ts";
import { typeScriptPlugin } from "./plugins/typescript/index.ts";
import { ISwaggerOptions } from "./swagger.ts";
import { IPluginContext } from "./plugins/typeDeclaration.ts";
import { start } from "./cli.ts";

/**
 * 创建上下文
 * @param options
 */
const createContext = (context: IPluginContext) => context;

/**
 * 初始化插件管理器
 */
const initPluginManager = (context: IPluginContext) => {
  const pluginManager = new PluginManager();

  // 注册插件
  pluginManager.register(typeScriptPlugin);
  // 启动所有插件
  pluginManager.setupAll(context);
};

const main = (): ISwaggerOptions => {
  // 解析参数
  const args = parse(Deno.args);

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

if (import.meta.main) {
  const options = main();
  // 创建上下文
  const context = createContext({ options });

  // 清空控制台信息
  Logs.clear();
  // 初始化插件管理器
  initPluginManager(context);
  // 启动
  start(context, options.url, options);
}
