import { start } from "@lonu/stc";

// 导入解析方法
// import { parserDefinition } from "@lonu/stc/plugin/definition";
// import { parserActions } from '@lonu/stc/plugin/action'

/** @type {import('@lonu/stc/plugin/types').IPlugin} */
const myPlugin = {
  name: "stc:myPlugin",
  lang: "cs",
  setup(options) {
    console.log(options);
    // 类型映射
    return {};
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
