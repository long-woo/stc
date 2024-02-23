// import swc from "npm:@swc/core";
import * as esbuild from "x/esbuild@v0.19.2/mod.js";

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
// import { generateDeclarationFile } from "./declarationGenerator.ts";

let pluginOptions: ISwaggerOptions;
// let swcOptions: swc.Options;
const actionDeclareData = new Map<string, string>();

/**
 * Transforms the given code using esbuild.
 *
 * @param {string} code - The code to transform.
 * @return {Promise<string>} The transformed code.
 */
const esTransform = async (code: string) => {
  const result = await esbuild.transform(code, {
    loader: "ts",
    target: "esnext",
    legalComments: "inline",
    format: "esm",
  });

  esbuild.stop();

  return result.code;
};

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
    // swcOptions = {
    //   jsc: {
    //     parser: {
    //       syntax: "typescript",
    //     },
    //     target: "esnext",
    //   },
    // };
  },
  async onTransform(def, action) {
    const typeFileName = "_types";
    const _defContent = parserDefinition(def);
    const _actionData = parserPath(action);
    const _actionMapData = new Map<string, string>();

    for (const [key, content] of _actionData) {
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

      const _import = content.import;
      const _apiImport = [
        `import webClient from '${_importPath}shared/${pluginOptions.platform}/fetch'`,
      ];
      const _apiContent: Array<string> = [];

      if (_import.length) {
        _apiImport.unshift(
          `import type { ${
            _import.join(", ")
          } } from '${_importPath}${typeFileName}'`,
        );
      }

      _apiContent.push(_apiImport.join("\n"));
      content.interface?.length &&
        _apiContent.push(content.interface?.join("\n\n"));
      content.export?.length && _apiContent.push(content.export.join("\n\n"));

      const _tsCode = _apiContent.join("\n\n");

      // const _tsCodeDeclaration = await generateDeclarationFile(_tsCode);
      // const _jsCode = await swc.transform(_tsCode, swcOptions);
      const _jsCode = await esTransform(_tsCode);

      // actionDeclareData.set(key, _tsCodeDeclaration);
      _actionMapData.set(key, _jsCode);
    }

    // const _typeDeclaration = await generateDeclarationFile(_defContent);
    // const _defContentOutput = await swc.transform(_defContent, swcOptions);
    const _defContentOutput = await esTransform(_defContent);

    // actionDeclareData.set("_types", _typeDeclaration);

    return {
      definition: {
        filename: `${typeFileName}.js`,
        content: _defContentOutput,
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
    const _baseFileContent = await esTransform(createBaseFile());

    if (pluginOptions.platform === "axios") {
      const _axiosFileContent = await esTransform(createAxiosFile());

      createFile(
        `${pluginOptions.outDir}/shared/axios/fetch.${pluginOptions.lang}`,
        _axiosFileContent,
      );
    }

    if (pluginOptions.platform === "wechat") {
      const _wechatFileContent = await esTransform(createWechatFile());

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
