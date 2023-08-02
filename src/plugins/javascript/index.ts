import { ISwaggerOptions } from "../../swagger.ts";
import { IPlugin } from "../typeDeclaration.ts";
import { parserDefinition } from "../typescript/defintion.ts";
import { parserPath } from "../typescript/path.ts";

let pluginOptions: ISwaggerOptions;

export const JavaScriptPlugin: IPlugin = {
  name: "stc:JavaScriptPlugin",
  lang: "js",
  setup(options: ISwaggerOptions) {
    pluginOptions = options;
  },
  onTransform(def, action) {
    const defContent = parserDefinition(def);

    return {
      definition: {
        filename: `type.d.ts`,
        content: defContent,
      },
    };
  },
};
