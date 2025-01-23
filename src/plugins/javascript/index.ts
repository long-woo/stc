import type { ISwaggerOptions } from "../../swagger.ts";
import type {
  IPlugin,
  IPluginTransformDefinition,
} from "../typeDeclaration.ts";

import { createFile } from "../../common.ts";
import shared from "../typescript/shared/index.ts";
import { TypeScriptPlugin } from "../typescript/index.ts";
import { renderEtaString } from "../common.ts";
import { generateDeclarationFile, oxcTransform } from "./oxc.ts";
// TODO: Deno compile 不支持 storage
// import { generateDeclarationFile } from "./declarationGenerator.ts";

let pluginOptions: ISwaggerOptions;
const actionDeclareData = new Map<string, string>();

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

    if (_tsTransform?.definition && _tsTransform.definition.content) {
      const _typeDeclaration = generateDeclarationFile(
        _tsTransform.definition.content,
      );

      actionDeclareData.set("_types", _typeDeclaration);
    }

    if (_tsTransform?.action) {
      for (const [key, content] of _tsTransform.action) {
        const { code, declaration } = oxcTransform(content);

        actionDeclareData.set(key, declaration ?? "");
        _actionMapData.set(key.replace(/\.ts/, `.${this.lang}`), code);
      }
    }

    return {
      definition: _definition,
      action: _actionMapData,
    };
  },
  onEnd() {
    if (!pluginOptions.shared) return;

    // 创建运行时需要的文件
    const _baseFile = oxcTransform(shared.apiClientBase);
    const _parserFetchRuntime = renderEtaString(
      shared.fetchRuntime,
      pluginOptions as unknown as Record<string, unknown>,
    );
    const _fetchRuntimeFile = oxcTransform(_parserFetchRuntime);
    const _httpClient = oxcTransform(shared[pluginOptions.client!]);

    createFile(
      `${pluginOptions.outDir}/shared/${pluginOptions.client}/index.${this.lang}`,
      _httpClient.code,
    );

    createFile(
      `${pluginOptions.outDir}/shared/apiClientBase.${this.lang}`,
      _baseFile.code,
    );

    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.${this.lang}`,
      _fetchRuntimeFile.code,
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
      _baseFile.declaration ?? "",
    );
    createFile(
      `${pluginOptions.outDir}/shared/fetchRuntime.d.ts`,
      _fetchRuntimeFile.declaration ?? "",
    );
    createFile(
      `${pluginOptions.outDir}/shared/${pluginOptions.client}/index.d.ts`,
      _httpClient.declaration ?? "",
    );
  },
};
