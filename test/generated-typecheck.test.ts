import { test } from "vitest";
import { Command, makeTempDir, remove, writeTextFile } from "./helpers.ts";
import { assertEquals } from "./helpers.ts";

const spec = {
  openapi: "3.0.0",
  info: { title: "typecheck", version: "1.0.0" },
  paths: {
    "/pet/{petId}": {
      post: {
        operationId: "updatePetWithForm",
        tags: ["pet"],
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          { name: "name", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "ok" } },
      },
    },
  },
};

/**
 * 生成的多参数容器是 `interface`，TypeScript 不会给 `interface` 隐式索引签名，
 * 因此运行时的 `ApiClientParams` 不能声明成 `Record` 类型，否则调用处报 TS2322。
 */
test("生成的代码可以通过类型检查", async () => {
  const outDir = await makeTempDir();
  const specFile = `${outDir}/openapi.json`;

  try {
    await writeTextFile(specFile, JSON.stringify(spec));

    const generate = new Command(process.execPath, {
      args: [
        "--import",
        "tsx",
        "src/main.ts",
        `--url=${specFile}`,
        `--outDir=${outDir}/out`,
      ],
    });
    assertEquals((await generate.output()).code, 0);

    const check = new Command(process.execPath, {
      args: [
        `${process.cwd()}/node_modules/typescript/bin/tsc`,
        "--noEmit",
        "--skipLibCheck",
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "bundler",
        "--baseUrl",
        `${process.cwd()}/node_modules`,
        `${outDir}/out/pet.ts`,
      ],
      stderr: "piped",
      stdout: "piped",
    });

    const { stdout: stderr } = await check.output();
    const _output = new TextDecoder().decode(stderr);

    assertEquals(_output.trim(), "");
  } finally {
    await remove(outDir, { recursive: true });
  }
});
