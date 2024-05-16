import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";

let pluginOptions: ISwaggerOptions;

/**
 * dart 插件。
 * 依赖 [dio](https://github.com/cfug/dio)
 */
export const dartPlugin: IPlugin = {
  name: "stc:DartPlugin",
  lang: "dart",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
  },
  onTransform(def, action) {
    return {};
  },
};
