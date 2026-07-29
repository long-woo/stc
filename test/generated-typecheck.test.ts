import { assertEquals } from "@std/assert";

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
Deno.test("生成的代码可以通过类型检查", async () => {
  const outDir = await Deno.makeTempDir();
  const specFile = `${outDir}/openapi.json`;

  try {
    await Deno.writeTextFile(specFile, JSON.stringify(spec));

    const generate = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "src/main.ts",
        `--url=${specFile}`,
        `--outDir=${outDir}/out`,
      ],
    });
    assertEquals((await generate.output()).code, 0);

    const check = new Deno.Command("deno", {
      args: [
        "check",
        "--no-config",
        "--no-lock",
        "--unstable-sloppy-imports",
        `${outDir}/out/pet.ts`,
      ],
      stderr: "piped",
      stdout: "piped",
    });

    const { stderr } = await check.output();
    const _output = new TextDecoder().decode(stderr);

    // `axios` 未安装导致的模块解析错误与本用例无关，只断言类型本身的错误
    assertEquals(
      _output.split("\n").filter((line) => /TS2322|TS2304|TS2345/.test(line)),
      [],
    );
  } finally {
    await Deno.remove(outDir, { recursive: true });
  }
});
