#!/usr/bin/env node
import { main, resolveOptions } from "./cli.ts";
import { start } from "./app.ts";
import { runOnce, startWatch } from "./watcher.ts";

import Logs from "./console.ts";

export const run = async () => {
  const result = await main();

  if (result.options.watch) {
    // 监听模式：首次生成失败不中断，继续监听
    await runOnce(result.options);
    await startWatch(result, resolveOptions);
  } else {
    // 启动
    await start(result.options);
  }
};

void run().catch((error) => {
  Logs.error(error);
  process.exitCode = 1;
});
