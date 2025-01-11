import type { IPlugin, IPluginOptions } from "../typeDeclaration.ts";
import type { ISwaggerOptions } from "../../swagger.ts";
import { parserDefinition } from "../definition.ts";
import { parserActions } from "../action.ts";
import { setupTemplate } from "../common.ts";
import { createFile } from "../../common.ts";
import shared from "./shared/index.ts";
import template from "./template/index.ts";

let pluginOptions: IPluginOptions;

/**
 * dart 插件。
 * 依赖 [dio](https://github.com/cfug/dio)
 */
export const DartPlugin: IPlugin = {
  name: "stc:DartPlugin",
  lang: "dart",
  setup(options: ISwaggerOptions) {
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
      template: {
        enum: template.enum,
        definitionHeader: template.definitionHeader,
        definitionBody: template.definitionBody,
        definitionFooter: template.definitionFooter,
        actionImport: template.actionImport,
        actionMethod: template.actionMethod,
      },
    };

    setupTemplate(pluginOptions);
  },
  onTransform(def, action) {
    const typeFileName = "_types";
    const defContent = parserDefinition(def, pluginOptions);
    const actionData = parserActions(action, typeFileName, pluginOptions);

    return {
      definition: {
        filename: `${typeFileName}.${this.lang}`,
        content: defContent,
      },
      action: actionData,
    };
  },
  onEnd() {
    createFile(
      `${pluginOptions.outDir}/shared/api_client_base.${this.lang}`,
      shared.api_client_base,
    );

    createFile(
      `${pluginOptions.outDir}/shared/dio/index.${this.lang}`,
      shared.dio,
    );
  },
};
