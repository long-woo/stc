import swc from "npm:@swc/core";

import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";

import { parserDefinition } from "../typescript/defintion.ts";
import { createFile } from "../../util.ts";
import { parserPath } from "../typescript/path.ts";
import { generateDeclarationFile } from "./declarationGenerator.ts";

let pluginOptions: ISwaggerOptions;
const actionDeclareData = new Map<string, string>();

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
  },
  async onTransform(def, action) {
    const _swcOptions: swc.Options = {
      jsc: {
        parser: {
          syntax: "typescript",
        },
        target: "esnext",
      },
    };
    const _defContent = parserDefinition(def);
    const _actionData = parserPath(action);
    const _actionMapData = new Map<string, string>();

    for (const [key, content] of _actionData) {
      const _import = content.import;
      const _apiImport = [
        `import webClient from './shared/${pluginOptions.platform}/fetch'`,
      ];
      const _apiContent: Array<string> = [];

      if (_import.length) {
        _apiImport.unshift(
          `import type { ${_import.join(", ")} } from './types'`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      content.interface?.length &&
        _apiContent.push(content.interface?.join("\n\n"));
      content.export?.length && _apiContent.push(content.export.join("\n\n"));

      const _tsCode = _apiContent.join("\n\n");
      console.log(_tsCode);
      const _tsCodeDeclaration = await generateDeclarationFile(_tsCode);
      const _jsCode = await swc.transform(_tsCode, _swcOptions);

      actionDeclareData.set(key, _tsCodeDeclaration);
      _actionMapData.set(key, _jsCode.code);
    }

    const _typeDeclaration = await generateDeclarationFile(_defContent);
    const _defContentOutput = await swc.transform(_defContent, _swcOptions);

    actionDeclareData.set("types", _typeDeclaration);

    return {
      definition: {
        filename: "types.js",
        content: _defContentOutput.code,
      },
      action: _actionMapData,
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
