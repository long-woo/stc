// https://petstore3.swagger.io/api/v3/openapi.json
import { assertEquals } from "std/testing/asserts.ts";

Deno.test("测试-在命令行中", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
