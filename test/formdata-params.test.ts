// 表单（multipart/form-data、x-www-form-urlencoded）多参数场景下，
// 嵌套对象属性的内部定义命名与放置位置回归测试
import { assertEquals, assertStringIncludes } from "@std/assert";

import { start } from "../src/app.ts";
import { getApiPath } from "../src/core.ts";
import { parserActions } from "../src/plugins/action.ts";
import { setupTemplate } from "../src/plugins/common.ts";
import { TypeScriptPlugin } from "../src/plugins/typescript/index.ts";
import type { IPluginOptions } from "../src/plugins/typeDeclaration.ts";

const spec = {
  openapi: "3.0.0",
  info: { title: "pet", version: "1.0.0" },
  paths: {
    "/pet": {
      "put": {
        "operationId": "updatePet",
        "tags": ["pet"],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": { $ref: "#/components/schemas/Pet" },
            },
          },
        },
        "responses": {
          "200": {
            "description": "ok",
            "content": {
              "application/json": {
                "schema": { $ref: "#/components/schemas/Pet" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Category: {
        type: "object",
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string" },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string" },
        },
      },
      Pet: {
        type: "object",
        required: ["name", "photoUrls"],
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string" },
          category: { $ref: "#/components/schemas/Category" },
          photoUrls: { type: "array", items: { type: "string" } },
          tags: {
            type: "array",
            items: { $ref: "#/components/schemas/Tag" },
          },
          status: {
            type: "string",
            description: "pet status in the store",
            "enum": ["available", "pending", "sold"],
          },
        },
      },
    },
  },
} as const;

const getPetContent = () => {
  const actions = getApiPath(
    spec.paths as never,
    { conjunction: "_" } as never,
    spec.components.schemas as never,
  );

  const options = {
    ...TypeScriptPlugin.setup!({} as never),
    lang: "ts",
  } as IPluginOptions;

  setupTemplate(options, { langDirectoryName: options.langDirectoryName });

  return parserActions(actions, "_types", options).get("pet.ts") ?? "";
};

Deno.test("formData 包装定义只生成一次，子定义另行命名", () => {
  const content = getPetContent();

  // 包装 interface 仅一个，不能因嵌套对象属性而重名重复
  assertEquals(
    content.match(/export interface UpdatePetFormDataParams \{/g)?.length,
    1,
  );

  // 嵌套对象属性引用独立命名的子定义
  assertStringIncludes(
    content,
    "category?: UpdatePetFormDataParamsCategory;",
  );
  assertStringIncludes(
    content,
    "export interface UpdatePetFormDataParamsCategory {",
  );

  // 枚举、外部引用保持正常
  assertStringIncludes(content, "status?: UpdatePetFormDataParamsStatus;");
  assertStringIncludes(content, "tags?: Tag[];");
  assertStringIncludes(content, "import type { Tag } from './_types'");
});

Deno.test("formData 子定义不嵌入包装定义内部", () => {
  const content = getPetContent();

  // 子定义必须位于包装定义的 region 之外
  const wrapperStart = content.indexOf(
    "export interface UpdatePetFormDataParams {",
  );
  const wrapperEnd = content.indexOf("// #endregion", wrapperStart);
  const childStart = content.indexOf(
    "export interface UpdatePetFormDataParamsCategory {",
  );

  assertEquals(wrapperStart > -1, true);
  assertEquals(wrapperEnd > -1, true);
  assertEquals(childStart > -1, true);
  assertEquals(childStart < wrapperStart || childStart > wrapperEnd, true);
});

Deno.test("生成的 formData 代码可以通过类型检查", async () => {
  const outDir = await Deno.makeTempDir();
  const specFile = `${outDir}/openapi.json`;

  try {
    await Deno.writeTextFile(specFile, JSON.stringify(spec));

    // 直接调用 `start`，避免 CLI 检查更新依赖网络
    await start({
      url: specFile,
      outDir: `${outDir}/out`,
      client: "axios",
      lang: "ts",
      conjunction: "_",
      clean: true,
      shared: true,
    } as never);

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

    // 截图中的问题均为语法类错误（TS1xxx）；
    // axios 未安装等模块解析错误与本用例无关
    assertEquals(
      _output.split("\n").filter((line) => /TS1\d{3}/.test(line)),
      [],
    );
  } finally {
    await Deno.remove(outDir, { recursive: true });
  }
});
