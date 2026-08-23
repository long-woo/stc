import { main, resolveOptions } from "./cli.ts";
import { start } from "./app.ts";
import { runOnce, startWatch } from "./watcher.ts";

const result = await main();

if (result.options.watch) {
  // 监听模式：首次生成失败不中断，继续监听
  await runOnce(result.options);
  await startWatch(result, resolveOptions);
} else {
  // 启动
  await start(result.options);
}
