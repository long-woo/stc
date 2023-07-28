import { main } from "./cli.ts";
import { start } from "./app.ts";

if (import.meta.main) {
  const options = await main();

  // 启动
  start(options);
}
