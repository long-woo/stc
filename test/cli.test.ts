import { assertEquals } from "@std/assert";

Deno.test("version", async () => {
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

Deno.test("help", async () => {
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

Deno.test("mcp shortcut", async () => {
  const outDir = await Deno.makeTempDir({ prefix: "stc_mcp_" });
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--mcp",
      "--url=./examples/mcp-tools/openapi.yaml",
      `--outDir=${outDir}`,
    ],
  });
  const { code } = await command.output();

  assertEquals(code, 0);
  const document = JSON.parse(
    await Deno.readTextFile(`${outDir}/mcp-tools.json`),
  );
  assertEquals(document.tools.length, 4);

  await Deno.remove(outDir, { recursive: true });
});

Deno.test("filter", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--filter=/user*",
      "-f=!/user/createWithList",
    ],
  });
  const { code, stdout } = await command.output();

  console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

Deno.test("conjunction", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=./test/wp-json.json",
      "-c=with",
    ],
  });
  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("actionIndex", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=./test/action-index.json",
      "--actionIndex=-2",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("shared", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=./test/demo1.json",
      "--shared=false",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("additionalProperties", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=./test/additional-properties.json",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("globalHeader(gh)", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=https://petstore3.swagger.io/api/v3/openapi.json",
      "--globalHeader=authorization",
      "--gh=custom-header",
    ],
  });
  const { code } = await command.output();

  assertEquals(0, code);
});

Deno.test("tagSpaceHeader", async () => {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "src/main.ts",
      "--url=./test/tag-space-header.json",
    ],
  });
  const { code, stdout } = await command.output();
  console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});
