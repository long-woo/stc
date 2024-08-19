import type { IPlugin, IPluginOptions } from "../typeDeclaration.ts";
import { createFile, parseEta } from "../../common.ts";
import { parserDefinition } from "../defintion.ts";
import { parserActions } from "../action.ts";
import { setupTemplate } from "../common.ts";
import {
  createAxiosFile,
  createBaseFile,
  createFetchFile,
  createFetchRuntimeFile,
  createWechatFile,
} from "./shared/index.ts";

// Deno 当前版本（1.45.2）未支持
// import webClientBaseFile from "./shared/apiClientBase.ts" with { type: "text" };

let pluginOptions: IPluginOptions;

export const TypeScriptPlugin: IPlugin = {
  name: "stc:TypeScriptPlugin",
  lang: "ts",
  setup(options: IPluginOptions) {
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
    // 创建运行时需要的文件
    const _baseFileContent = createBaseFile();
    const _fetchRuntimeFileContent = parseEta(
      createFetchRuntimeFile(),
      pluginOptions as unknown as Record<string, unknown>,
    );

    if (pluginOptions.client === "axios") {
      const _axiosFileContent = createAxiosFile();

      createFile(
        `${pluginOptions.outDir}/shared/axios/index.ts`,
        _axiosFileContent,
      );
      // copyFile(
      //   "./src/plugins/typescript/shared/axios",
      //   `${pluginOptions.outDir}/shared/axios`,
      // );
    }

    if (pluginOptions.client === "wechat") {
      const _wechatFileContent = createWechatFile();

      createFile(
        `${pluginOptions.outDir}/shared/wechat/index.ts`,
        _wechatFileContent,
      );
    }

    if (pluginOptions.client === "fetch") {
      const _fetchFileContent = createFetchFile();

      createFile(
        `${pluginOptions.outDir}/shared/fetch/index.ts`,
        _fetchFileContent,
      );
    }

    createFile(
      `${pluginOptions.outDir}/shared/apiClientBase.ts`,
      _baseFileContent,
    );

    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.ts`,
      _fetchRuntimeFileContent,
    );
  },
};
