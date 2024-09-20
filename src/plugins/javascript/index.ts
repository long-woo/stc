import * as esbuild from "npm:esbuild@^0.23.1";

import type { ISwaggerOptions } from "../../swagger.ts";
import type {
  IPlugin,
  IPluginTransformDefinition,
} from "../typeDeclaration.ts";

import { createFile } from "../../common.ts";
import shared from "../typescript/shared/index.ts";
import { TypeScriptPlugin } from "../typescript/index.ts";
import { renderEtaString } from "../common.ts";
import { generateDeclarationFile } from "./oxc.ts";
// TODO: Deno compile 不支持 storage
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
    TypeScriptPlugin.setup(options);
  },
  async onTransform(def, action) {
    const _tsTransform = await TypeScriptPlugin.onTransform(def, action);
    const _definition: IPluginTransformDefinition = {
      filename: `_types.${this.lang}`,
      content: "",
    };
    const _actionMapData = new Map<string, string>();

    if (_tsTransform?.definition) {
      _definition.content = await esTransform(_tsTransform.definition.content);
      const _typeDeclaration = generateDeclarationFile(
        _tsTransform.definition.content,
      );

      actionDeclareData.set("_types", _typeDeclaration);
    }

    if (_tsTransform?.action) {
      for (const [key, content] of _tsTransform.action) {
        const _tsCodeDeclaration = generateDeclarationFile(content);
        const _jsCode = await esTransform(content);

        actionDeclareData.set(key, _tsCodeDeclaration);
        _actionMapData.set(key.replace(/\.ts/, `.${this.lang}`), _jsCode);
      }
    }

    return {
      definition: _definition,
      action: _actionMapData,
    };
  },
  async onEnd() {
    // 创建运行时需要的文件
    const _baseFileContent = await esTransform(shared.apiClientBase);
    const _parserFetchRuntime = renderEtaString(
      shared.fetchRuntime,
      pluginOptions as unknown as Record<string, unknown>,
    );
    const _fetchRuntimeFileContent = await esTransform(_parserFetchRuntime);
    const _httpClientContent = await esTransform(shared[pluginOptions.client!]);

    createFile(
      `${pluginOptions.outDir}/shared/${pluginOptions.client}/index.${this.lang}`,
      _httpClientContent,
    );

    createFile(
      `${pluginOptions.outDir}/shared/apiClientBase.${this.lang}`,
      _baseFileContent,
    );

    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.${this.lang}`,
      _fetchRuntimeFileContent,
    );

    // 创建接口声明文件
    actionDeclareData.forEach((item, key) => {
      createFile(
        `${pluginOptions.outDir}/${key}.d.ts`,
        item,
      );
    });
    createFile(
      `${pluginOptions.outDir}/shared/apiClientBase.d.ts`,
      generateDeclarationFile(shared.apiClientBase),
    );
    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.d.ts`,
      generateDeclarationFile(_parserFetchRuntime),
    );
    createFile(
      `${pluginOptions.outDir}/shared/${pluginOptions.client}/index.d.ts`,
      generateDeclarationFile(shared[pluginOptions.client!]),
    );
  },
};
