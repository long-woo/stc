import { assertEquals } from "std/testing/asserts.ts";

Deno.test("测试-输出版本信息", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--version",
    ],
  });
  const { code } = await command.output();

  // console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

Deno.test("测试-输出帮助信息", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--help",
    ],
  });
  const { code } = await command.output();

  // console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});
