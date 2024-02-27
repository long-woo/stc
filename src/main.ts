import { main } from "./cli.ts";
import { start } from "./app.ts";

const options = await main();

// 启动
start(options);
