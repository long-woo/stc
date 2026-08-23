import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";

import { getApiPath } from "../../../core.ts";
import { McpPlugin } from "../index.ts";

const spec = {
  paths: {
    "/tasks/{taskId}": {
      patch: {
        operationId: "updateTask",
        tags: ["tasks"],
        summary: "Update a task",
        parameters: [{
          name: "taskId",
          in: "path",
          required: true,
          schema: { type: "integer" },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", description: "New task title" },
                  completed: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "ok" } },
      },
    },
  },
} as const;

Deno.test("MCP plugin generates a valid tools/list JSON document", async () => {
  const actions = getApiPath(
    spec.paths as never,
    { conjunction: "_" } as never,
  );
  const result = await McpPlugin.onTransform!(
    new Map(),
    actions,
    {} as never,
  );
  const document = JSON.parse(result.definition!.content);
  const tool = document.tools[0];

  assertEquals(document.tools.length, 1);
  assertEquals(tool.name, "updateTask");
  assertEquals(tool.description, "Update a task");
  assertEquals(tool.inputSchema.type, "object");
  assertEquals(tool.inputSchema.required, ["taskId", "body"]);
  assertEquals(tool.inputSchema.properties.taskId.type, "integer");
  assertEquals(tool.inputSchema.properties.body.required, ["title"]);
  assertEquals(
    tool.inputSchema.properties.body.properties.title.description,
    "New task title",
  );
  assertEquals(tool["x-stc-http"], {
    method: "PATCH",
    path: "/tasks/{taskId}",
    parameters: [
      {
        in: "path",
        name: "taskId",
        input: "taskId",
        required: true,
      },
      { in: "body", name: "body", input: "body", required: true },
    ],
  });
  assertEquals(result.definition!.banner, false);
});

Deno.test("MCP plugin creates unique safe tool names", async () => {
  const actions = new Map([
    ["tag@same.tool", {
      url: "/one",
      method: "get",
      parameters: { path: [], query: [], body: [], formData: [], header: [] },
      requestHeaders: [],
      responseHeaders: [],
      response: {},
      summary: "one",
      description: "",
      tag: "tag",
      deprecated: false,
    }],
    ["tag@same-tool", {
      url: "/two",
      method: "get",
      parameters: { path: [], query: [], body: [], formData: [], header: [] },
      requestHeaders: [],
      responseHeaders: [],
      response: {},
      summary: "two",
      description: "",
      tag: "tag",
      deprecated: false,
    }],
  ]);
  const result = await McpPlugin.onTransform!(
    new Map(),
    actions,
    {} as never,
  );
  const document = JSON.parse(result.definition!.content);

  assertEquals(document.tools.map((tool: { name: string }) => tool.name), [
    "same-tool",
    "same-tool-2",
  ]);
  assertExists(document.tools[0].inputSchema.properties);
  assertStringIncludes(result.definition!.content, '"x-stc-http"');
});
