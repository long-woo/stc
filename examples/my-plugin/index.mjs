import { start } from "@loongwoo/stc";

// TODO: v2.13.0 /** @type {import('@loongwoo/stc/plugins/typeDeclaration.d.ts')} */
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
