import { assertEquals } from "@std/assert";

Deno.test("JavaScript 插件", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--lang=js",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
