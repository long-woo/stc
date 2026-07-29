import { assertEquals } from "@std/assert";

import { getApiPath, getDefinition } from "../src/core.ts";
import type { IDefinitionVirtualProperty } from "../src/swagger.ts";

Deno.test("支持 allOf 的定义与请求响应解析", () => {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "allOf",
      version: "1.0.0",
    },
    paths: {
      "/pets": {
        post: {
          operationId: "createPet",
          tags: ["pet"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/BasePet" },
                    {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                      },
                      required: ["name"],
                    },
                  ],
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
                    allOf: [
                      { $ref: "#/components/schemas/BasePet" },
                      {
                        type: "object",
                        properties: {
                          status: { type: "string" },
                        },
                        required: ["status"],
                      },
                    ],
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
        BasePet: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        Pet: {
          allOf: [
            { $ref: "#/components/schemas/BasePet" },
            {
              type: "object",
              properties: {
                name: { type: "string" },
              },
              required: ["name"],
            },
          ],
        },
      },
    },
  } as const;

  const definitions = getDefinition(spec.components.schemas as never);
  const petProperties = definitions.get("Pet") as IDefinitionVirtualProperty[];
  assertEquals(
    petProperties.map((item) => item.name).sort(),
    ["id", "name"],
  );

  const actions = getApiPath(
    spec.paths as never,
    { conjunction: "_" } as never,
    spec.components.schemas as never,
  );
  const action = actions.get("pet@createPet");

  assertEquals(
    action?.parameters.body[0].properties?.map((item) => item.name).sort(),
    ["id", "name"],
  );
  assertEquals(action?.response.properties?.map((item) => item.name).sort(), [
    "id",
    "status",
  ]);
});
