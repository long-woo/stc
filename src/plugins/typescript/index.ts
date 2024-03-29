import { createFile } from "../../util.ts";
import { ISwaggerOptions } from "../../swagger.ts";
import { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "./defintion.ts";
import { parserPath } from "./path.ts";
import {
  createAxiosFile,
  createBaseFile,
  createWechatFile,
} from "./shared/index.ts";

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
        `import webClient from '${_importPath}shared/${pluginOptions.platform}/fetch'`,
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

    if (pluginOptions.platform === "axios") {
      const _axiosFileContent = createAxiosFile();

      createFile(
        `${pluginOptions.outDir}/shared/axios/fetch.${pluginOptions.lang}`,
        _axiosFileContent,
      );
    }

    if (pluginOptions.platform === "wechat") {
      const _wechatFileContent = createWechatFile();

      createFile(
        `${pluginOptions.outDir}/shared/wechat/fetch.${pluginOptions.lang}`,
        _wechatFileContent,
      );
    }

    createFile(
      `${pluginOptions.outDir}/shared/webClientBase.${pluginOptions.lang}`,
      _baseFileContent,
    );
  },
};
