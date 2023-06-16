import { ISwaggerOptions } from "../../swagger.ts";
import { IPlugin } from "../typeDeclaration.ts";

export const typeScriptPlugin: IPlugin = {
  name: "oi:TypeScriptPlugin",
  setup(options: ISwaggerOptions) {
    console.log("oi:TypeScriptPlugin setup", options);
  },

  onLoad(data) {
    console.log(data);
  },
};
