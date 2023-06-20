// https://petstore3.swagger.io/api/v3/openapi.json
import { assert, assertEquals } from "std/testing/asserts.ts";

Deno.test("测试-在命令行中", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/mod.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--outDir=out",
    ],
  });

  const { code, stdout, stderr } = await command.output();
  // console.assert(code === 0);
  // console.assert("hello\n" === new TextDecoder().decode(stdout));
  // console.assert("world\n" === new TextDecoder().decode(stderr));
  assertEquals(0, code);
});
