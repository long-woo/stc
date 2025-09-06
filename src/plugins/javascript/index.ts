import type {
  IPlugin,
  IPluginTransformDefinition,
} from "../typeDeclaration.ts";

import { createFile } from "../../utils.ts";
import shared from "../typescript/shared/index.ts";
import { TypeScriptPlugin } from "../typescript/index.ts";
import { renderEtaString } from "../common.ts";
import { generateDeclarationFile, oxcTransform } from "./oxc.ts";

const actionDeclareData = new Map<string, string>();

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
  setup(context) {
    return TypeScriptPlugin.setup(context);
  },
  async onTransform(def, action, options) {
    const _tsTransform = await TypeScriptPlugin.onTransform(
      def,
      action,
      options,
    );
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

        actionDeclareData.set(key.replace(/\.js/, ""), declaration ?? "");
        _actionMapData.set(key, code);
      }
    }

    return {
      definition: _definition,
      action: _actionMapData,
    };
  },
  onEnd(options) {
    if (!options.shared) return;

    // 创建运行时需要的文件
    const _baseFile = oxcTransform(shared.apiClientBase);
    const _parserFetchRuntime = renderEtaString(
      shared.fetchRuntime,
      options as unknown as Record<string, unknown>,
    );
    const _fetchRuntimeFile = oxcTransform(_parserFetchRuntime);
    const _httpClient = oxcTransform(shared[options.client!]);

    createFile(
      `${options.outDir}/shared/${options.client}/index.${this.lang}`,
      _httpClient.code,
    );

    createFile(
      `${options.outDir}/shared/apiClientBase.${this.lang}`,
      _baseFile.code,
    );

    createFile(
      `${options.outDir}/shared/fetchRuntime.${this.lang}`,
      _fetchRuntimeFile.code,
    );

    // 创建接口声明文件
    actionDeclareData.forEach((item, key) => {
      createFile(
        `${options.outDir}/${key}.d.ts`,
        item,
      );
    });
    createFile(
      `${options.outDir}/shared/apiClientBase.d.ts`,
      _baseFile.declaration ?? "",
    );
    createFile(
      `${options.outDir}/shared/fetchRuntime.d.ts`,
      _fetchRuntimeFile.declaration ?? "",
    );
    createFile(
      `${options.outDir}/shared/${options.client}/index.d.ts`,
      _httpClient.declaration ?? "",
    );
  },
};
