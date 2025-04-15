import type { IPlugin, IPluginOptions } from "../typeDeclaration.ts";
import type { ISwaggerOptions } from "../../swagger.ts";
import { createFile } from "../../utils.ts";
import { parserDefinition } from "../definition.ts";
import { parserActions } from "../action.ts";
import { renderEtaString, setupTemplate } from "../common.ts";
import shared from "./shared/index.ts";
import template from "./template/index.ts";

// Deno 当前版本（1.45.2）未支持
// import webClientBaseFile from "./shared/apiClientBase.ts" with { type: "text" };

let pluginOptions: IPluginOptions;

export const TypeScriptPlugin: IPlugin = {
  name: "stc:TypeScriptPlugin",
  lang: "ts",
  setup(options: ISwaggerOptions) {
    pluginOptions = {
      ...options,
      unknownType: "unknown",
      typeMap(func, type) {
        return {
          string: "string",
          integer: "number",
          boolean: "boolean",
          array: `${
            type && func(type, undefined, pluginOptions) ||
            pluginOptions.unknownType
          }[]`,
          object: `Record<string, ${pluginOptions.unknownType}>`,
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
    };

    setupTemplate(pluginOptions, { langDirectoryName: "typescript" });
  },

  /**
   * Transforms the given definition and action into an object containing
   * the definition content and action data.
   *
   * @param {type} def - the definition parameter
   * @param {type} action - the action parameter
   * @return {type} an object containing the definition content and action data
   */
  onTransform(def, action) {
    const typeFileName = "_types";
    const defContent = parserDefinition(def, pluginOptions);
    const actionData = parserActions(action, typeFileName, pluginOptions);

    return {
      definition: {
        filename: `${typeFileName}.ts`,
        content: defContent,
      },
      action: actionData,
    };
  },

  onEnd() {
    if (!pluginOptions.shared) return;

    // 创建运行时需要的文件
    const _fetchRuntimeFileContent = renderEtaString(
      shared.fetchRuntime,
      pluginOptions as unknown as Record<string, unknown>,
    );

    const _httpClientContent = shared[pluginOptions.client!];

    createFile(
      `${pluginOptions.outDir}/shared/${pluginOptions.client}/index.ts`,
      _httpClientContent,
    );

    createFile(
      `${pluginOptions.outDir}/shared/apiClientBase.ts`,
      shared.apiClientBase,
    );

    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.ts`,
      _fetchRuntimeFileContent,
    );
  },
};
