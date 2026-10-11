import { test } from "vitest";
import { Command } from "./helpers.ts";
import { assertEquals } from "./helpers.ts";

test("本地文件", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=test/demo1.json",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
