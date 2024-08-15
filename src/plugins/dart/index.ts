import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "./defintion.ts";
import { parserActions } from "./action.ts";
import { copyFile } from "../../common.ts";

let pluginOptions: ISwaggerOptions;

/**
 * dart 插件。
 * 依赖 [dio](https://github.com/cfug/dio)
 */
export const DartPlugin: IPlugin = {
  name: "stc:DartPlugin",
  lang: "dart",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
  },
  onTransform(def, action) {
    const typeFileName = "_types";
    const defContent = parserDefinition(def);
    const actionData = parserActions(action, typeFileName, DartPlugin.lang);

    return {
      definition: {
        filename: `${typeFileName}.${DartPlugin.lang}`,
        content: defContent,
      },
      action: actionData,
    };
  },
  onEnd() {
    copyFile("./src/plugins/dart/shared", `${pluginOptions.outDir}/shared`);
  },
};
