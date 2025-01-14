import { assertEquals } from "@std/assert";

Deno.test("Swift Plugin - Code Generation", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--lang=swift",
    ],
  });

  const { code } = await command.output();
  assertEquals(code, 0, "Command should execute successfully");
});
