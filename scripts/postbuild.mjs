import { chmod } from "node:fs/promises";
await chmod("dist/src/main.js", 0o755);
