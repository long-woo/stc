import { assertEquals, assertStringIncludes } from "@std/assert";

import { getApiPath } from "../src/core.ts";
import { parserActions } from "../src/plugins/action.ts";
import { setupTemplate } from "../src/plugins/common.ts";
import { TypeScriptPlugin } from "../src/plugins/typescript/index.ts";
import type { IPluginOptions } from "../src/plugins/typeDeclaration.ts";

const spec = {
  paths: {
    "/store/order": {
      post: {
        operationId: "placeOrder",
        tags: ["store"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  status: {
                    type: "string",
                    description: "Order Status",
                    enum: ["placed", "approved", "delivered"],
                  },
                  category: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                    },
                  },
                  tags: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Tag" },
                  },
                  groups: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        members: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "integer" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "ok" },
        },
      },
    },
    "/store/orders/bulk": {
      post: {
        operationId: "bulkOrder",
        tags: ["store"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    metadata: {
                      type: "object",
                      properties: {
                        source: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      accepted: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Tag: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
      },
    },
  },
} as const;

const getStoreContent = () => {
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

  return parserActions(actions, "_types", options).get("store.ts") ?? "";
};

Deno.test("内部定义的枚举属性会生成对应的枚举定义", () => {
  const content = getStoreContent();

  assertStringIncludes(content, "status?: PlaceOrderBodyParamsStatus;");
  assertStringIncludes(
    content,
    "export type PlaceOrderBodyParamsStatus = 'placed' | 'approved' | 'delivered';",
  );
});

Deno.test("内部定义的对象属性引用当前作用域下的定义名", () => {
  const content = getStoreContent();

  assertStringIncludes(content, "category?: PlaceOrderBodyParamsCategory;");
  assertStringIncludes(
    content,
    "export interface PlaceOrderBodyParamsCategory {",
  );
});

Deno.test("内部定义引用的外部类型会被导入", () => {
  const content = getStoreContent();

  assertStringIncludes(content, "tags?: Tag[];");
  assertStringIncludes(content, "import type { Tag } from './_types'");
});

Deno.test("数组 items 中的深层 properties 会递归生成内部定义", () => {
  const content = getStoreContent();

  assertStringIncludes(content, "groups?: PlaceOrderBodyParamsGroups[];");
  assertStringIncludes(
    content,
    "export interface PlaceOrderBodyParamsGroups {",
  );
  assertStringIncludes(
    content,
    "members?: PlaceOrderBodyParamsGroupsMembers[];",
  );
  assertStringIncludes(
    content,
    "export interface PlaceOrderBodyParamsGroupsMembers {",
  );
  assertStringIncludes(content, "id?: number;");
});

Deno.test("顶层数组请求与响应会保留数组类型并解析 items.properties", () => {
  const content = getStoreContent();

  assertStringIncludes(content, "body: BulkOrderBodyParams[]");
  assertStringIncludes(content, "metadata?: BulkOrderBodyParamsMetadata;");
  assertStringIncludes(content, "Promise<BulkOrderResponse[]>");
  assertStringIncludes(content, "export interface BulkOrderResponse {");
  assertStringIncludes(content, "accepted?: boolean;");
});

Deno.test("内部定义不会残留 core.ts 的 `Body` 占位类型名", () => {
  const content = getStoreContent();

  assertEquals(/\bBody[A-Z]\w*/.exec(content), null);
});
