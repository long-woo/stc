import { test } from "vitest";
import { Command } from "./helpers.ts";
// https://petstore3.swagger.io/api/v3/openapi.json
import { assertEquals } from "./helpers.ts";

test("解决动态路径生成方法被覆盖的问题", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/wp-json.json",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

test("支持URL路径Query参数解析", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/blog-json.json",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
