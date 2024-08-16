import type { IPlugin, IPluginOptions } from "../typeDeclaration.ts";
import { parserDefinition } from "../defintion.ts";
import { parserActions } from "../action.ts";
import { copyFile } from "../../common.ts";

let pluginOptions: IPluginOptions;

/**
 * dart 插件。
 * 依赖 [dio](https://github.com/cfug/dio)
 */
export const DartPlugin: IPlugin = {
  name: "stc:DartPlugin",
  lang: "dart",
  setup(options: IPluginOptions) {
    pluginOptions = {
      ...options,
      unknownType: "dynamic",
      typeMap(func, type) {
        return {
          string: "String",
          integer: "int",
          boolean: "bool",
          array: `List<${
            type &&
              func(
                type,
                undefined,
                pluginOptions,
              ) ||
            pluginOptions.unknownType
          }>`,
          object: `Map<String, ${pluginOptions.unknownType}>`,
          null: "null",
        };
      },
    };
  },
  onTransform(def, action) {
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
