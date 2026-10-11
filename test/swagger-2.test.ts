import { test } from "vitest";
import { Command } from "./helpers.ts";
// https://petstore.swagger.io/v2/swagger.json
import { assertEquals } from "./helpers.ts";

test("v2", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/swagger-v2.yml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();
  // console.assert("hello\n" === new TextDecoder().decode(stdout));
  // console.assert("world\n" === new TextDecoder().decode(stderr));
  assertEquals(0, code);
});
