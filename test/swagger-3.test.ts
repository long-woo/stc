import { test } from "vitest";
import { Command } from "./helpers.ts";
// https://petstore3.swagger.io/api/v3/openapi.json
import { assertEquals } from "./helpers.ts";

test("v3", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/openapi-v3.yaml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
