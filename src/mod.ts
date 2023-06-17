import Logs from "./console.ts";
import { PluginManager } from "./plugins/index.ts";
import { typeScriptPlugin } from "./plugins/typescript/index.ts";
import { IPluginContext } from "./plugins/typeDeclaration.ts";
import { main, start } from "./cli.ts";

const __VERSION__ = "1.0.0";

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
