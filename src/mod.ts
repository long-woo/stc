import { parse } from "https://deno.land/std@0.106.0/flags/mod.ts";

import Logs from "./console.ts";
import { generateApi } from "./typescript/index.ts";

const main = () => {
  // 解析参数
  const args = parse(Deno.args);

  // 文件输出目录，默认为 Deno 当前执行的目录
  let outDir = Deno.cwd();

  // 检查 lang 选项
  if (typeof args.lang !== "string" || !args.lang) {
    Logs.error("必须提供 --lang 选项。");
    Deno.exit();
  }

  // 若没有提供 out 选项，则使用 Deno 当前执行的目录
  if (typeof args.out === "string" && args.out) {
    outDir = args.out;
  }

  return {
    lang: args.lang,
    outDir,
  };
};

if (import.meta.main) {
  const { lang, outDir } = main();

  // https://petstore.swagger.io/v2/swagger.json
  generateApi("http://demodata.liangyihui.net/smart/v2/api-docs", outDir);
}
