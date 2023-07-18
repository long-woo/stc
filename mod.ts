/**
 * @example
 * ```ts
 * import { start } from "https://deno.land/x/stc@$X_VERSION/mod.ts";
 * 
 * const myPlugin: IPlugin = {
 *  name: "stc:MyPlugin",
 *  setup(options) {
 *    console.log(options)
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
export { start } from "./src/cli.ts";
