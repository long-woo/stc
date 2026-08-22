import { assertEquals, assertThrows } from "@std/assert";
import { parseSpec } from "../src/parser.ts";

Deno.test("parseSpec - JSON 内容", () => {
  const data = parseSpec(
    '{"openapi":"3.0.1","info":{"title":"Api","version":"1.0"}}',
  );

  assertEquals("3.0.1", data.openapi);
  assertEquals("Api", data.info.title);
});

Deno.test("parseSpec - YAML 内容（.yaml 扩展名）", () => {
  const data = parseSpec(
    `openapi: 3.0.1
info:
  title: Api
  version: "1.0"`,
    "test/openapi-v3.yaml",
  );

  assertEquals("3.0.1", data.openapi);
  assertEquals("Api", data.info.title);
});

Deno.test("parseSpec - YAML 内容（.yml 远程地址）", () => {
  const data = parseSpec(
    `swagger: "2.0"
info:
  title: Api`,
    "https://example.com/spec.yml",
  );

  assertEquals("2.0", data.swagger);
});

Deno.test("parseSpec - 无扩展名时回退 YAML 解析", () => {
  const data = parseSpec(
    `openapi: 3.0.1
info:
  title: Api
  version: "1.0"`,
    "https://example.com/export/openapi/3",
  );

  assertEquals("3.0.1", data.openapi);
});

Deno.test("parseSpec - 内容为空时报错", () => {
  assertThrows(() => parseSpec("   "));
});

Deno.test("parseSpec - 内容不是对象时报错", () => {
  assertThrows(() => parseSpec("123"));
  assertThrows(() => parseSpec("- a\n- b", "test/spec.yaml"));
});
