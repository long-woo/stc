import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "./defintion.ts";
import { parserActions } from "./action.ts";

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
    const actions = parserActions(action);
    const actionData = new Map<string, string>();

    actions.forEach((api, key) => {
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

      const _imports = api.imports;
      const _apiImport = [
        `import '${_importPath}shared/dio/index.dart';`,
      ];
      const _apiContent: Array<string> = [];

      if (_imports.length) {
        _apiImport.push(
          `import '${_importPath}${typeFileName}.dart';`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      api.definitions?.length &&
        _apiContent.push(api.definitions?.join("\n\n"));
      api.methods?.length && _apiContent.push(api.methods.join("\n\n"));

      actionData.set(`${key}.dart`, _apiContent.join("\n\n"));
    });

    return {
      definition: {
        filename: `${typeFileName}.dart`,
        content: defContent,
      },
      action: actionData,
    };
  },
};
