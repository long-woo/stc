import { serve, readTextFile } from "./helpers.ts";
import { test } from "vitest";
import { Command } from "./helpers.ts";
import { assertEquals } from "./helpers.ts";

test("yaml - v3 本地文件", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=test/openapi-v3.yaml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

test("yml - v2 本地文件", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=test/swagger-v2.yml",
      "--outDir=out",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

test("yaml - 远程文件", async () => {
  const content = await readTextFile("test/openapi-v3.yaml");
  const server = await serve(
    { port: 0, hostname: "127.0.0.1" },
    () => new Response(content),
  );
  try {
    const command = new Command(process.execPath, {
      args: [
        "--import",
        "tsx",
        "src/main.ts",
        `--url=http://127.0.0.1:${server.addr.port}/openapi.yaml`,
        "--outDir=out",
      ],
    });

    const { code } = await command.output();

    assertEquals(0, code);
  } finally {
    await server.shutdown();
  }
});
