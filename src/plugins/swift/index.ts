import type { IPlugin, IPluginSetup } from "../typeDeclaration.ts";
import { parserDefinition } from "../definition.ts";
import { parserActions } from "../action.ts";
import { createFile } from "../../utils.ts";
import template from "./template/index.ts";
import shared from "./shared/index.ts";

/**
 * Swift plugin
 * Depends on [Alamofire](https://github.com/Alamofire/Alamofire)
 */
export const SwiftPlugin: IPlugin = {
  name: "stc:SwiftPlugin",
  lang: "swift",
  setup() {
    const pluginSetup: IPluginSetup = {
      unknownType: "JSONValue",
      typeMap(func, type) {
        const _newType =
          type && func(type, undefined, undefined, pluginSetup) ||
          pluginSetup.unknownType;

        return {
          string: "String",
          integer: "Int",
          number: "Double",
          boolean: "Bool",
          file: "APIFile",
          array: `[${_newType}]`,
          object: `[String: ${_newType}]`,
          null: "JSONValue",
        };
      },
      template: {
        enum: template.enum,
        definitionHeader: template.definitionHeader,
        definitionBody: template.definitionBody,
        definitionFooter: template.definitionFooter,
        actionImport: template.actionImport,
        actionMethod: template.actionMethod,
      },
    };

    return pluginSetup;
  },
  onTransform(def, action, options) {
    const typeFileName = "Models";
    const defContent = `import Foundation\n\n${parserDefinition(def, options)}`;
    const actionData = parserActions(action, typeFileName, options);

    return {
      definition: {
        filename: `${typeFileName}.${this.lang}`,
        content: defContent,
      },
      action: actionData,
    };
  },
  async onEnd(options) {
    if (!options.shared) return;

    // Copy template files to output directory
    await Promise.all([
      createFile(
        `${options.outDir}/shared/APIClientBase.${this.lang}`,
        shared.APIClientBase,
      ),
      createFile(
        `${options.outDir}/shared/alamofire/APIClient.${this.lang}`,
        shared.APIClient,
      ),
    ]);
  },
};
