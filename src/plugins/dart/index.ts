import type { IPlugin, IPluginSetup } from "../typeDeclaration.ts";
import { parserDefinition } from "../definition.ts";
import { parserActions } from "../action.ts";
import { createFile } from "../../utils.ts";
import shared from "./shared/index.ts";
import template from "./template/index.ts";

/**
 * dart 插件。
 * 依赖 [dio](https://github.com/cfug/dio)
 */
export const DartPlugin: IPlugin = {
  name: "stc:DartPlugin",
  lang: "dart",
  setup() {
    const pluginSetup: IPluginSetup = {
      unknownType: "dynamic",
      typeMap(func, type) {
        const _newType =
          type && func(type, undefined, undefined, pluginSetup) ||
          pluginSetup.unknownType;

        return {
          string: "String",
          integer: "int",
          boolean: "bool",
          array: `List<${_newType}>`,
          object: `Map<String, ${_newType}>`,
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

    return pluginSetup;
  },
  onTransform(def, action, options) {
    const typeFileName = "_types";
    const defContent = parserDefinition(def, options);
    const actionData = parserActions(action, typeFileName, options);

    return {
      definition: {
        filename: `${typeFileName}.${this.lang}`,
        content: defContent,
      },
      action: actionData,
    };
  },
  onEnd(options) {
    if (!options.shared) return;

    createFile(
      `${options.outDir}/shared/api_client_base.${this.lang}`,
      shared.api_client_base,
    );

    createFile(
      `${options.outDir}/shared/dio/index.${this.lang}`,
      shared.dio,
    );
  },
};
