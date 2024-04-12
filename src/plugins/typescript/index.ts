import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";
import { createFile, parseEta } from "../../util.ts";
import { parserDefinition } from "./defintion.ts";
import { parserPath } from "./path.ts";
import {
  createAxiosFile,
  createBaseFile,
  createFetchRuntimeFile,
  createWechatFile,
} from "./shared/index.ts";

// Deno 当前版本（1.42.1）未支持
// import webClientBaseFile from "./shared/webClientBase.ts" with { type: "text" };

let pluginOptions: ISwaggerOptions;

export const TypeScriptPlugin: IPlugin = {
  name: "stc:TypeScriptPlugin",
  lang: "ts",
  /**
   * Set up the function with the given options.
   *
   * @param {ISwaggerOptions} options - The options for setting up the function.
   */
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
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
    const defContent = parserDefinition(def);
    const pathData = parserPath(action);

    const actionData = new Map<string, string>();

    pathData.forEach((api, key) => {
      // 处理导入文件相对路径，根据 key 中是否存在 `/`
      const _keyPath = key.split("/");
      // 移除一项
      _keyPath.pop();
      const _importPath = _keyPath.reduce((prev, _) => {
        if (prev === "./") {
          prev = "";
        }

        prev += "../";
        return prev;
      }, "./");

      const _import = api.import;
      const _apiImport = [
        `import { fetchRuntime } from '${_importPath}shared/fetchRuntime'`,
      ];
      const _apiContent: Array<string> = [];

      if (_import.length) {
        _apiImport.push(
          `import type { ${
            _import.join(", ")
          } } from '${_importPath}${typeFileName}'`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      api.interface?.length && _apiContent.push(api.interface?.join("\n\n"));
      api.export?.length && _apiContent.push(api.export.join("\n\n"));

      actionData.set(key, _apiContent.join("\n\n"));
    });

    return {
      definition: {
        filename: `${typeFileName}.${pluginOptions.lang}`,
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

    if (pluginOptions.platform === "axios") {
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

    if (pluginOptions.platform === "wechat") {
      const _wechatFileContent = createWechatFile();

      createFile(
        `${pluginOptions.outDir}/shared/wechat/index.ts`,
        _wechatFileContent,
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
