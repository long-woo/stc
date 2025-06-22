import { start } from "@lonu/stc";

// 导入解析 eta 文件
import { buildEta } from "@lonu/stc/plugin/common";

// 导入解析方法
// import { parserDefinition } from "@lonu/stc/plugin/definition";
// import { parserActions } from '@lonu/stc/plugin/action'

/** @type {import('@lonu/stc/plugin/types').IPlugin} */
const myPlugin = {
  name: "stc:myPlugin",
  lang: "cs",
  async setup(context) {
    // template 的文件是伪代码。
    const template = await buildEta("./template");

    console.log(context);

    // 类型映射
    return {
      unknownType: "",
      typeMap(func, type) {
        const _newType =
          type && func(type, undefined, undefined, pluginSetup) ||
          pluginSetup.unknownType;

        return {
          string: "string",
          integer: "int",
          boolean: "boolean",
          array: `List<${_newType}>`,
          object: "object",
          file: "File",
          null: "null",
          bool: "boolean",
        };
      },
      template,
    };
  },
};

start({
  lang: "cs",
  outDir: "./dist",
  url: "https://petstore3.swagger.io/api/v3/openapi.json",
  plugins: [
    myPlugin,
  ],
});
