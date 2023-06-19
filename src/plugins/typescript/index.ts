import { dirname, fromFileUrl, join } from "std/path/mod.ts";

import { copyFile } from "/src/util.ts";
import { ISwaggerOptions } from "../../swagger.ts";
import { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "./defintion.ts";
import { parserPath } from "./path.ts";

let pluginOptions: ISwaggerOptions;

export const typeScriptPlugin: IPlugin = {
  name: "stc:TypeScriptPlugin",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
  },

  onTransform(def, action) {
    const defContent = parserDefinition(def);
    const pathData = parserPath(action);

    const actionData = new Map<string, string>();

    pathData.forEach((api, key) => {
      const _import = api.import;
      const _apiImport = [
        `import webClient from './shared/${pluginOptions.platform}/fetch'`,
      ];
      const _apiContent: Array<string> = [];

      if (_import.length) {
        _apiImport.push(
          `import type { ${_import.join(", ")} } from './types'`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      api.interface?.length && _apiContent.push(api.interface?.join("\n\n"));
      api.export?.length && _apiContent.push(api.export.join("\n\n"));

      actionData.set(key, _apiContent.join("\n\n"));
    });

    return {
      definition: defContent,
      action: actionData,
    };
  },

  onEnd() {
    // 复制运行时需要的文件
    copyFile(
      join(dirname(fromFileUrl(import.meta.url)), "/shared"),
      `${pluginOptions.outDir}/shared`,
    );
  },
};
