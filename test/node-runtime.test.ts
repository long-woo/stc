import { test, expect } from "vitest";
import { mkdtemp, writeFile, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfigFile } from "../src/config.ts";
import { waitForChange } from "../src/watcher.ts";
import { parseArgs } from "../src/args.ts";
import { getApiPath } from "../src/core.ts";
import { isNewerVersion } from "../src/version.ts";

test("config reload picks up TS and JS dependency edits", async () => {
  const dir = await mkdtemp(join(tmpdir(), "stc-reload-"));
  try {
    for (const extension of ["ts", "js"]) {
      const dependency = join(dir, `settings.${extension}`);
      const config = join(dir, `stc.config.${extension}`);
      await writeFile(
        config,
        `import { language } from './settings.${extension}'; export default { lang: language };`,
      );
      await writeFile(dependency, 'export const language = "ts";');
      expect((await loadConfigFile(config)).options.lang).toBe("ts");
      await writeFile(dependency, 'export const language = "js";');
      expect((await loadConfigFile(config)).options.lang).toBe("js");
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("watch handles atomic replacement and deletion/recreation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "stc-watch-"));
  const controller = new AbortController();
  try {
    const path = join(dir, "spec.json");
    await writeFile(path, "{}");
    for (const mode of ["rename", "recreate"]) {
      const change = waitForChange(
        { url: path, outDir: join(dir, "out") },
        undefined,
        controller.signal,
      );
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (mode === "rename") {
        await writeFile(`${path}.new`, '{"new":true}');
        await rename(`${path}.new`, path);
      } else {
        await rm(path);
        await writeFile(path, '{"recreated":true}');
      }
      expect(await change).toBe("spec");
    }
  } finally {
    controller.abort();
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI parser preserves repeated aliases, negative values and explicit false", () => {
  const args = parseArgs(
    [
      "--filter=/pet*",
      "-f=!/pet/remove",
      "--shared=false",
      "--actionIndex=-2",
      "--nd",
    ],
    {
      boolean: ["shared", "noDeprecated"],
      string: ["filter", "actionIndex"],
      alias: { f: "filter", nd: "noDeprecated" },
      collect: ["filter"],
      unknown: (arg) => {
        throw Error(arg);
      },
    },
  );
  expect(args.filter).toEqual(["/pet*", "!/pet/remove"]);
  expect(args.shared).toBe(false);
  expect(args.actionIndex).toBe("-2");
  expect(args.noDeprecated).toBe(true);
  expect(() =>
    parseArgs(["--unknown"], {
      boolean: [],
      string: [],
      alias: {},
      collect: [],
      unknown: (arg) => {
        throw Error(arg);
      },
    }),
  ).toThrow();
});

test("noDeprecated filtering remains available", () => {
  const paths = {
    "/old": {
      get: { deprecated: true, responses: { "200": { description: "ok" } } },
    },
    "/new": { get: { responses: { "200": { description: "ok" } } } },
  };
  expect(
    getApiPath(paths, { url: "", outDir: "", noDeprecated: true }).size,
  ).toBe(1);
  expect(getApiPath(paths, { url: "", outDir: "" }).size).toBe(2);
});

test("update version comparison includes stable upgrade from a prerelease", () => {
  expect(isNewerVersion("3.0.0", "3.0.0-rc.1")).toBe(true);
  expect(isNewerVersion("2.17.1", "3.0.0")).toBe(false);
  expect(isNewerVersion("3.0.1", "3.0.0")).toBe(true);
  expect(isNewerVersion("malformed", "3.0.0")).toBe(false);
});
