import { test } from "vitest";
import { Command } from "../../../../test/helpers.ts";
import { assertEquals } from "../../../../test/helpers.ts";

test("JavaScript 插件", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/openapi-v3.yaml",
      "--lang=js",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
