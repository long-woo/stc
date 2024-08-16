import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "../defintion.ts";
import { parserActions } from "../action.ts";
import { copyFile } from "../../common.ts";

let pluginOptions: ISwaggerOptions;

/**
 * dart 插件。
 * 依赖 [dio](https://github.com/cfug/dio)
 */
export const DartPlugin: IPlugin = {
  name: "stc:DartPlugin",
  lang: "dart",
  unknownType: "dynamic",
  setup(options: ISwaggerOptions) {
    console.log(this);
    pluginOptions = options;
  },
  onTransform(def, action) {
    // console.log(this);
    const typeFileName = "_types";
    const defContent = parserDefinition(def, pluginOptions);
    const actionData = parserActions(action, typeFileName, pluginOptions);

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
