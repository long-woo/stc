/**
 * @example
 * ```ts
 * import { start } from "https://deno.land/x/stc@$X_VERSION/mod.ts";
 * // 导入解析方法
 * import { parserDefinition } from "npm:@lonu/stc/plugin/definition";
 * import { parserActions } from 'npm:@lonu/stc/plugin/action'
 * 
 * const myPlugin: IPlugin = {
 *  name: "stc:MyPlugin",
 *  setup(context) {
 *  console.log(context);
 *    // 类型映射
 *    return {};
 *  },
 *  onTransform(def, action) {
 *    // 转换 definition
 *    const defContent: string = parserDefinition(def)
 *    // 转换 action
 *    const actionContent: Map<string, string> = parserAction(action)
 *    // 返回转换后的内容
 *    return {
 *      definition: defContent,
 *      action: actionContent
 *    }
 *  }
 * }
 *
 * start({
 *  // ...其他配置
 *  plugins: [myPlugin]
 * })
 * ```
 *
 * @module
 */
export { start } from "./src/app.ts";

import type { IConfigFileOptions } from "./src/config.ts";

/**
 * Helper for defining a stc config file (stc.config.json / .stcrc.json / .stcrc).
 * Only provides type hints, returns the config as-is.
 *
 * @param config - Config options, same names as the CLI options
 */
export const defineConfig = (config: IConfigFileOptions): IConfigFileOptions =>
  config;
