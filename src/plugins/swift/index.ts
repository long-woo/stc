import type { IPlugin, IPluginOptions } from "../typeDeclaration.ts";
import type { ISwaggerOptions } from "../../swagger.ts";
import { parserDefinition } from "../definition.ts";
import { parserActions } from "../action.ts";
import { setupTemplate } from "../common.ts";
import { createFile } from "../../common.ts";
import template from "./template/index.ts";
import shared from "./shared/index.ts";

let pluginOptions: IPluginOptions;

/**
 * Swift plugin
 * Depends on [Alamofire](https://github.com/Alamofire/Alamofire)
 */
export const SwiftPlugin: IPlugin = {
  name: "stc:SwiftPlugin",
  lang: "swift",
  setup(options: ISwaggerOptions) {
    pluginOptions = {
      ...options,
      unknownType: "Any",
      typeMap(func, type) {
        return {
          string: "String",
          integer: "Int",
          boolean: "Bool",
          array: `[${
            type &&
              func(
                type,
                undefined,
                pluginOptions,
              ) ||
            pluginOptions.unknownType
          }]`,
          object: "[String: Any]",
          null: "nil",
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

    setupTemplate(pluginOptions);
  },
  onTransform(def, action) {
    const typeFileName = "Models";
    const defContent = parserDefinition(def, pluginOptions);
    const actionData = parserActions(action, typeFileName, pluginOptions);

    return {
      definition: {
        filename: `${typeFileName}.${this.lang}`,
        content: defContent,
      },
      action: actionData,
    };
  },
  onEnd() {
    if (!pluginOptions.shared) return;

    // Copy template files to output directory
    createFile(
      `${pluginOptions.outDir}/shared/APIClientBase.${this.lang}`,
      shared.APIClientBase,
    );

    createFile(
      `${pluginOptions.outDir}/shared/alamofire/APIClient.${this.lang}`,
      shared.APIClient,
    );
  },
};
