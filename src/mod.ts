import { main, start } from "./cli.ts";

const __VERSION__ = "1.0.0";
Deno.env.set("VERSION", __VERSION__);

if (import.meta.main) {
  const options = main();

  // 启动
  start(options);
}
