import { assertEquals } from "@std/assert";

Deno.test("yaml - v3 本地文件", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=test/openapi-v3.yaml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("yml - v2 本地文件", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=test/swagger-v2.yml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("yaml - 远程文件", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.yaml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});
