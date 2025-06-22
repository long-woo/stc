import type { IPlugin, IPluginSetup } from "../typeDeclaration.ts";
import { createFile } from "../../utils.ts";
import { parserDefinition } from "../definition.ts";
import { parserActions } from "../action.ts";
import { renderEtaString } from "../common.ts";
import shared from "./shared/index.ts";
import template from "./template/index.ts";

export const TypeScriptPlugin: IPlugin = {
  name: "stc:TypeScriptPlugin",
  lang: "ts",
  setup() {
    const pluginSetup: IPluginSetup = {
      unknownType: "unknown",
      typeMap(func, type) {
        const _newType =
          type && func(type, undefined, undefined, pluginSetup) ||
          pluginSetup.unknownType;

        return {
          string: "string",
          integer: "number",
          boolean: "boolean",
          array: `${_newType}[]`,
          object: `Record<string, ${_newType}>`,
          file: "File",
          null: "null",
          bool: "boolean",
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
      langDirectoryName: "typescript",
    };

    return pluginSetup;
  },

  /**
   * Transforms the given definition and action into an object containing
   * the definition content and action data.
   *
   * @param {type} def - the definition parameter
   * @param {type} action - the action parameter
   * @return {type} an object containing the definition content and action data
   */
  onTransform(def, action, options) {
    const typeFileName = "_types";
    const defContent = parserDefinition(def, options);
    const actionData = parserActions(action, typeFileName, options);

    return {
      definition: {
        filename: `${typeFileName}.ts`,
        content: defContent,
      },
      action: actionData,
    };
  },

  onEnd(options) {
    if (!options.shared) return;

    // 创建运行时需要的文件
    const _fetchRuntimeFileContent = renderEtaString(
      shared.fetchRuntime,
      options as unknown as Record<string, unknown>,
    );

    const _httpClientContent = shared[options.client!];

    createFile(
      `${options.outDir}/shared/${options.client}/index.ts`,
      _httpClientContent,
    );

    createFile(
      `${options.outDir}/shared/apiClientBase.ts`,
      shared.apiClientBase,
    );

    createFile(
      `${options.outDir}/shared/fetchRuntime.ts`,
      _fetchRuntimeFileContent,
    );
  },
};
