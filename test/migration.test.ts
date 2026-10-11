import { test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { start } from "../src/app.ts";
import baseline from "./migration-baseline.json" with { type: "json" };

test("all five plugins preserve Deno v2/v3 generation output", async () => {
  const dir = await mkdtemp(join(tmpdir(), "stc-baseline-"));
  try {
    for (const lang of ["ts", "js", "dart", "swift", "mcp"]) {
      for (const spec of ["openapi-v3.yaml", "swagger-v2.yml"]) {
        await start({
          url: `test/${spec}`,
          outDir: join(dir, lang, spec),
          lang,
          client: "axios",
          shared: true,
          clean: true,
          conjunction: "By",
          actionIndex: -1,
        });
      }
    }
    const actual: Record<string, string> = {};
    const collect = async (path: string) => {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        const file = join(path, entry.name);
        if (entry.isDirectory()) await collect(file);
        else {
          const content = (await readFile(file, "utf8")).replace(
            /^\/\*\*[\s\S]*?https:\/\/github.com\/long-woo\/stc[\s\S]*?\*\/\s*/,
            "",
          );
          actual[relative(dir, file).replaceAll("\\", "/")] = createHash(
            "sha256",
          )
            .update(content)
            .digest("hex");
        }
      }
    };
    await collect(dir);
    expect(actual).toEqual(baseline.files);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
