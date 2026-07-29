import { assertStringIncludes } from "@std/assert";

import { getApiPath } from "../src/core.ts";
import { parserActions } from "../src/plugins/action.ts";
import { setupTemplate } from "../src/plugins/common.ts";
import { TypeScriptPlugin } from "../src/plugins/typescript/index.ts";
import type { IPluginOptions } from "../src/plugins/typeDeclaration.ts";

const spec = {
  paths: {
    "/pet/add": {
      post: {
        operationId: "addPet",
        tags: ["pet"],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddPetRequest" },
            },
          },
        },
        responses: { "200": { description: "ok" } },
      },
    },
    "/pet/batch": {
      post: {
        operationId: "batchPet",
        tags: ["pet"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
        },
        responses: { "200": { description: "ok" } },
      },
    },
  },
  components: {
    schemas: {
      AddPetRequest: {
        type: "object",
        properties: { name: { type: "string" } },
      },
      Pet: {
        type: "object",
        properties: { id: { type: "integer" } },
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

/** 导入语句中的类型名 */
const getImports = (content: string) =>
  (content.match(/import type \{([^}]*)\} from '\.\/_types'/s)?.[1] ?? "")
    .split(",").map((item) => item.trim()).filter(Boolean);

Deno.test("展开成本地定义的 body 引用不会被导入", () => {
  const content = getPetContent();

  // `AddPetRequest` 已展开成 `AddPetBodyParams`，产物里不再出现该类型
  assertStringIncludes(content, "export interface AddPetBodyParams {");

  const _unused = getImports(content).filter((name) =>
    !new RegExp(`\\b${name}\\b`).test(
      content.replace(/import type \{[^}]*\} from '\.\/_types'/s, ""),
    )
  );

  assertStringIncludes(`[${_unused.join(", ")}]`, "[]");
});

Deno.test("仍在产物中使用的引用会被导入", () => {
  const content = getPetContent();

  assertStringIncludes(content, "Pet[]");
  assertStringIncludes(getImports(content).join(","), "Pet");
});
