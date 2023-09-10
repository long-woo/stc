import swc from "npm:@swc/core";

import type { ISwaggerOptions } from "../../swagger.ts";
import type { IPlugin } from "../typeDeclaration.ts";

import { createFile } from "../../util.ts";
import { parserDefinition } from "../typescript/defintion.ts";
import { parserPath } from "../typescript/path.ts";
import {
  createAxiosFile,
  createBaseFile,
  createWechatFile,
} from "../typescript/shared/index.ts";
import { generateDeclarationFile } from "./declarationGenerator.ts";

let pluginOptions: ISwaggerOptions;
let swcOptions: swc.Options;
const actionDeclareData = new Map<string, string>();

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
    swcOptions = {
      jsc: {
        parser: {
          syntax: "typescript",
        },
        target: "esnext",
      },
    };
  },
  async onTransform(def, action) {
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
          `import type { ${_import.join(", ")} } from './_types'`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      content.interface?.length &&
        _apiContent.push(content.interface?.join("\n\n"));
      content.export?.length && _apiContent.push(content.export.join("\n\n"));

      const _tsCode = _apiContent.join("\n\n");

      const _tsCodeDeclaration = await generateDeclarationFile(_tsCode);
      const _jsCode = await swc.transform(_tsCode, swcOptions);

      actionDeclareData.set(key, _tsCodeDeclaration);
      _actionMapData.set(key, _jsCode.code);
    }

    const _typeDeclaration = await generateDeclarationFile(_defContent);
    const _defContentOutput = await swc.transform(_defContent, swcOptions);

    actionDeclareData.set("_types", _typeDeclaration);

    return {
      definition: {
        filename: "_types.js",
        content: _defContentOutput.code,
      },
      action: _actionMapData,
    };
  },
  async onEnd() {
    // 创建接口声明文件
    actionDeclareData.forEach((item, key) => {
      createFile(
        `${pluginOptions.outDir}/${key}.d.ts`,
        item,
      );
    });

    // 创建运行时需要的文件
    const _baseFileContent = await swc.transform(createBaseFile(), swcOptions);

    if (pluginOptions.platform === "axios") {
      const _axiosFileContent = await swc.transform(
        createAxiosFile(),
        swcOptions,
      );

      createFile(
        `${pluginOptions.outDir}/shared/axios/fetch.${pluginOptions.lang}`,
        _axiosFileContent.code,
      );
    }

    if (pluginOptions.platform === "wechat") {
      const _wechatFileContent = await swc.transform(
        createWechatFile(),
        swcOptions,
      );

      createFile(
        `${pluginOptions.outDir}/shared/wechat/fetch.${pluginOptions.lang}`,
        _wechatFileContent.code,
      );
    }

    createFile(
      `${pluginOptions.outDir}/shared/webClientBase.${pluginOptions.lang}`,
      _baseFileContent.code,
    );
  },
};
