import { test } from "vitest";
import { Command, makeTempDir, readTextFile, remove } from "./helpers.ts";
import { assertEquals } from "./helpers.ts";

test("version", async () => {
  const command = new Command(process.execPath, {
    args: ["--import", "tsx", "src/main.ts", "--version"],
  });
  const { code } = await command.output();

  // console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

test("help", async () => {
  const command = new Command(process.execPath, {
    args: ["--import", "tsx", "src/main.ts", "--help"],
  });
  const { code } = await command.output();

  // console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

test("mcp shortcut", async () => {
  const outDir = await makeTempDir({ prefix: "stc_mcp_" });
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--mcp",
      "--url=./examples/mcp-tools/openapi.yaml",
      `--outDir=${outDir}`,
    ],
  });
  const { code } = await command.output();

  assertEquals(code, 0);
  const document = JSON.parse(await readTextFile(`${outDir}/mcp-tools.json`));
  assertEquals(document.tools.length, 4);

  await remove(outDir, { recursive: true });
});

test("filter", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/openapi-v3.yaml",
      "--filter=/user*",
      "-f=!/user/createWithList",
    ],
  });
  const { code, stdout } = await command.output();

  console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});

test("conjunction", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/wp-json.json",
      "-c=with",
    ],
  });
  const { code } = await command.output();

  assertEquals(0, code);
});

test("actionIndex", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/action-index.json",
      "--actionIndex=-2",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

test("shared", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/demo1.json",
      "--shared=false",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

test("additionalProperties", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/additional-properties.json",
    ],
  });

  const { code } = await command.output();

  assertEquals(0, code);
});

test("globalHeader(gh)", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/openapi-v3.yaml",
      "--globalHeader=authorization",
      "--gh=custom-header",
    ],
  });
  const { code } = await command.output();

  assertEquals(0, code);
});

test("tagSpaceHeader", async () => {
  const command = new Command(process.execPath, {
    args: [
      "--import",
      "tsx",
      "src/main.ts",
      "--url=./test/tag-space-header.json",
    ],
  });
  const { code, stdout } = await command.output();
  console.log(new TextDecoder().decode(stdout));
  assertEquals(0, code);
});
