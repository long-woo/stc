import { ISwaggerOptions } from "../../swagger.ts";
import { createFile } from "../../util.ts";
import { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "../typescript/defintion.ts";
import { parserPath } from "../typescript/path.ts";

let pluginOptions: ISwaggerOptions;
const actionDeclareData = new Map<string, string>();

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
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
      const _apiDeclareContent: string[] = [];

      if (_import.length) {
        _apiDeclareContent.push(
          `import { ${_import.join(", ")} } from './types'`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      api.interface?.length &&
        _apiDeclareContent.push(api.interface?.join("\n\n"));
      api.export?.length && _apiContent.push(api.export.join("\n\n"));

      actionDeclareData.set(key, _apiDeclareContent.join("\n\n"));
      actionData.set(key, _apiContent.join("\n\n"));
    });

    return {
      definition: {
        filename: `types.d.ts`,
        content: defContent,
      },
      action: actionData,
    };
  },
  onEnd() {
    // 创建接口声明文件
    actionDeclareData.forEach((item, key) => {
      createFile(
        `${pluginOptions.outDir}/${key}.d.ts`,
        item,
      );
    });
  },
};
