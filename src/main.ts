import { main, start } from "./cli.ts";

if (import.meta.main) {
  const options = await main();

  // 启动
  start(options);
}
