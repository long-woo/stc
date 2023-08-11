import swc from "npm:@swc/core";

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
  async onTransform(def, action) {
    const _defContent = parserDefinition(def);
    // console.log(_defContent);
    // const defContent = await esbuild.transform(
    //   `export interface ApiResponse {
    //   code?: number;
    //   type?: string;
    //   message?: string;
    // }`,
    //   {
    //     loader: "ts",
    //     format: "esm",
    //   },
    // );
    // console.log(defContent.code);

    const defContent = await swc.transform(_defContent, {
      jsc: {
        parser: {
          syntax: "typescript",
        },
        target: "esnext",
      },
    });
    console.log(defContent.code);
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
        content: _defContent,
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
