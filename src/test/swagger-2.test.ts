// https://petstore.swagger.io/v2/swagger.json
import { assertEquals } from "std/testing/asserts.ts";

Deno.test("测试-在命令行中", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/mod.ts",
      "--url=https://petstore.swagger.io/v2/swagger.json",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();
  // console.assert("hello\n" === new TextDecoder().decode(stdout));
  // console.assert("world\n" === new TextDecoder().decode(stderr));
  assertEquals(0, code);
});
