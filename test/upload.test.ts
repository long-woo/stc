// OpenAPI v3 文件上传规范解析（multipart/form-data、application/octet-stream）
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";

import { getApiPath } from "../src/core.ts";

const loadSpec = async () =>
  JSON.parse(await Deno.readTextFile("test/upload.json"));

Deno.test("multipart/form-data 解析为 formData 参数，binary 归一为 file", async () => {
  const spec = await loadSpec();

  const actions = getApiPath(
    spec.paths as never,
    { conjunction: "_" } as never,
    spec.components?.schemas as never,
  );

  // 单文件上传：参数进 formData，而不是 body
  const single = actions.get("upload@uploadSingle");
  assertExists(single);
  assertEquals(single.parameters.body, []);
  assertEquals(single.parameters.formData.length, 1);
  const singleFile = single.parameters.formData[0];
  assertEquals(singleFile.name, "file");
  assertEquals(singleFile.type, "file");
  assertEquals(singleFile.format, "binary");
  assertEquals(singleFile.required, true);

  // 文件 + 额外表单字段：各属性展开为独立 formData 参数
  const withFields = actions.get("upload@uploadWithFields");
  assertExists(withFields);
  assertEquals(withFields.parameters.body, []);
  assertEquals(
    withFields.parameters.formData.map((item) => item.name),
    ["file", "name", "category"],
  );
  assertEquals(
    withFields.parameters.formData.map((item) => !!item.required),
    [true, false, false],
  );
  const category = withFields.parameters.formData.find(
    (item) => item.name === "category",
  );
  assertEquals(category?.enumOption, ["image", "document", "video"]);

  // 多文件上传：array 的 items.format: binary，元素类型归一为 file
  const batch = actions.get("upload@uploadBatch");
  assertExists(batch);
  const files = batch.parameters.formData.find(
    (item) => item.name === "files",
  );
  assertEquals(files?.type, "array");
  assertEquals(files?.ref, "file");
  assertEquals(files?.required, true);

  // 原始二进制流：整个请求体即文件，保留在 body
  const raw = actions.get("upload@uploadRaw");
  assertExists(raw);
  assertEquals(raw.parameters.formData, []);
  assertEquals(raw.parameters.body.length, 1);
  const rawBody = raw.parameters.body[0];
  assertEquals(rawBody.name, "file");
  assertEquals(rawBody.type, "file");
  assertEquals(rawBody.properties, []);
});

Deno.test("生成的 TS 代码：File 类型经 formData 发送，单参数不生成包装对象", async () => {
  const outDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "src/main.ts",
        "--url=test/upload.json",
        `--outDir=${outDir}`,
      ],
    });

    const { code } = await command.output();
    assertEquals(0, code);

    const content = await Deno.readTextFile(`${outDir}/upload.ts`);

    // 单文件：形参直接是 File，不定义 XxxBodyParams 包装对象
    assertStringIncludes(content, "uploadSingle = (file: File,");
    assertEquals(content.includes("UploadSingleBodyParams"), false);
    // 通过 formData 发送
    assertStringIncludes(content, "formData: {");
    // 多文件：File[]
    assertStringIncludes(content, "uploadBatch = (files: File[],");
    // 多表单字段：file 属性类型为 File
    assertStringIncludes(content, "file: File;");
    // 原始二进制流：body 传 File
    assertStringIncludes(content, "uploadRaw = (file: File,");
    // file 是内置类型，不应从类型文件导入
    assertEquals(content.includes("import type { file }"), false);
  } finally {
    await Deno.remove(outDir, { recursive: true });
  }
});
