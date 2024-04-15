import * as esbuild from "x/esbuild@v0.20.1/mod.js";

import type { ISwaggerOptions } from "../../swagger.ts";
import type {
  IPlugin,
  IPluginTransformDefinition,
} from "../typeDeclaration.ts";

import { createFile, parseEta } from "../../util.ts";
import {
  createAxiosFile,
  createBaseFile,
  createFetchRuntimeFile,
  createWechatFile,
} from "../typescript/shared/index.ts";
import { TypeScriptPlugin } from "../typescript/index.ts";
// import { generateDeclarationFile } from "./declarationGenerator.ts";

let pluginOptions: ISwaggerOptions;
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

  return result.code;
};

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
  },
  async onTransform(def, action) {
    const _tsTransform = await TypeScriptPlugin.onTransform(def, action);
    const _definition: IPluginTransformDefinition = {
      filename: "_types.js",
      content: "",
    };
    const _actionMapData = new Map<string, string>();

    if (_tsTransform?.definition) {
      _definition.content = await esTransform(_tsTransform.definition.content);
    }

    if (_tsTransform?.action) {
      for (const [key, content] of _tsTransform.action) {
        // const _tsCodeDeclaration = await generateDeclarationFile(_tsCode);
        const _jsCode = await esTransform(content);

        // actionDeclareData.set(key, _tsCodeDeclaration);
        _actionMapData.set(key.replace(/\.ts/, ".js"), _jsCode);
      }
    }

    // const _typeDeclaration = await generateDeclarationFile(_defContent);

    // actionDeclareData.set("_types", _typeDeclaration);

    return {
      definition: _definition,
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
    const _fetchRuntimeFileContent = await esTransform(parseEta(
      createFetchRuntimeFile(),
      pluginOptions as unknown as Record<string, unknown>,
    ));

    if (pluginOptions.platform === "axios") {
      const _axiosFileContent = await esTransform(createAxiosFile());

      createFile(
        `${pluginOptions.outDir}/shared/axios/index.js`,
        _axiosFileContent,
      );
    }

    if (pluginOptions.platform === "wechat") {
      const _wechatFileContent = await esTransform(createWechatFile());

      createFile(
        `${pluginOptions.outDir}/shared/wechat/index.js`,
        _wechatFileContent,
      );
    }

    createFile(
      `${pluginOptions.outDir}/shared/apiClientBase.js`,
      _baseFileContent,
    );

    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.js`,
      _fetchRuntimeFileContent,
    );
  },
};
