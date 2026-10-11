import { pathToFileURL } from "node:url";
import type { RunningCommand } from "./helpers.ts";
import { test } from "vitest";
import {
  Command,
  makeTempDir,
  mkdir,
  remove,
  serve,
  writeTextFile,
} from "./helpers.ts";
import { assertEquals, assertMatch } from "./helpers.ts";
import { exists } from "../src/fs.ts";
import {
  loadConfigFile,
  normalizeConfig,
  parseConfigContent,
} from "../src/config.ts";

const REPO_ROOT = process.cwd().replaceAll("\\", "/");
const TSX_LOADER = pathToFileURL(
  `${REPO_ROOT}/node_modules/tsx/dist/loader.mjs`,
).href;
const MAIN_TS = `${REPO_ROOT}/src/main.ts`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  condition: () => Promise<boolean>,
  timeoutMs: number,
  message: string,
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await condition()) return;

    await sleep(300);
  }

  throw new Error(`Timed out: ${message}`);
};

const runStc = (args: string[], cwd: string): RunningCommand => {
  const command = new Command(process.execPath, {
    args: ["--import", TSX_LOADER, MAIN_TS, ...args],
    cwd,
    stdout: "null",
    stderr: "null",
  });

  return command.spawn();
};

const SPEC_V1 = JSON.stringify({
  openapi: "3.0.1",
  info: { title: "watch test", version: "1.0" },
  paths: {
    "/ping": {
      get: {
        tags: ["ping"],
        summary: "ping",
        responses: { 200: { description: "ok" } },
      },
    },
  },
});

const SPEC_V2 = JSON.stringify({
  openapi: "3.0.1",
  info: { title: "watch test", version: "1.0" },
  paths: {
    "/ping": {
      get: {
        tags: ["ping"],
        summary: "ping",
        responses: { 200: { description: "ok" } },
      },
    },
    "/pong": {
      get: {
        tags: ["pong"],
        summary: "pong",
        responses: { 200: { description: "ok" } },
      },
    },
  },
});

test("config: parseConfigContent", () => {
  const options = parseConfigContent(
    JSON.stringify({ url: "./spec.json", outDir: "out" }),
    "stc.config.json",
  );

  assertEquals(options.url, "./spec.json");
  assertEquals(options.outDir, "out");
  assertEquals(parseConfigContent("", "stc.config.json"), {});

  let threw = false;

  try {
    parseConfigContent("{ invalid json", "stc.config.json");
  } catch {
    threw = true;
  }

  assertEquals(threw, true);
});

test("config: normalizeConfig", () => {
  const options = normalizeConfig({
    filter: "/pet*",
    globalHeader: "Authorization",
    interval: "5000",
  });

  assertEquals(options.filter, ["/pet*"]);
  assertEquals(options.globalHeader, ["Authorization"]);
  assertEquals(options.interval, 5000);
});

test("config: loadConfigFile with explicit path", async () => {
  const dir = await makeTempDir({ prefix: "stc_config_" });
  const path = `${dir}/my.json`;

  await writeTextFile(path, JSON.stringify({ lang: "js" }));

  const loaded = await loadConfigFile(path);

  assertEquals(loaded.path, path);
  assertEquals(loaded.options.lang, "js");

  const missing = await loadConfigFile(`${dir}/nope.json`);

  assertEquals(missing.path, undefined);
  assertEquals(missing.options, {});

  await remove(dir, { recursive: true });
});

test("config: auto discovery and generation", async () => {
  const dir = await makeTempDir({ prefix: "stc_config_" });

  await writeTextFile(
    `${dir}/stc.config.json`,
    JSON.stringify({
      url: `${REPO_ROOT}/test/wp-json.json`,
      outDir: "out_auto",
      shared: false,
      filter: "/wp/v2/posts*",
    }),
  );

  const child = runStc([], dir);
  const { code } = await child.status;

  assertEquals(code, 0);
  assertEquals(await exists(`${dir}/out_auto/_types.ts`), true);
  assertEquals(await exists(`${dir}/out_auto/文章.ts`), true);

  await remove(dir, { recursive: true });
});

test("config: explicit config resolves local paths from its directory", async () => {
  const dir = await makeTempDir({ prefix: "stc_config_" });
  const projectDir = `${dir}/project`;
  await mkdir(projectDir);
  await writeTextFile(`${projectDir}/openapi.json`, SPEC_V1);
  await writeTextFile(
    `${projectDir}/stc.config.json`,
    JSON.stringify({
      url: "./openapi.json",
      outDir: "./generated",
      shared: false,
    }),
  );

  const child = runStc(["--config", "./project/stc.config.json"], dir);
  const { code } = await child.status;

  assertEquals(code, 0);
  assertEquals(await exists(`${projectDir}/generated/ping.ts`), true);

  await remove(dir, { recursive: true });
});

test("config: ts config file", async () => {
  const dir = await makeTempDir({ prefix: "stc_config_" });

  await writeTextFile(
    `${dir}/stc.config.ts`,
    `export default {
  url: "${REPO_ROOT}/test/wp-json.json",
  outDir: "out_ts_config",
  shared: false,
  filter: "/wp/v2/posts*",
};
`,
  );

  const child = runStc([], dir);
  const { code } = await child.status;

  assertEquals(code, 0);
  assertEquals(await exists(`${dir}/out_ts_config/_types.ts`), true);

  await remove(dir, { recursive: true });
});

test("config: cli args override config file", async () => {
  const dir = await makeTempDir({ prefix: "stc_config_" });

  await writeTextFile(
    `${dir}/stc.config.json`,
    JSON.stringify({
      url: `${REPO_ROOT}/test/wp-json.json`,
      outDir: "out_config",
      shared: false,
      filter: "/wp/v2/posts*",
    }),
  );

  const child = runStc(["-o", "out_cli"], dir);
  const { code } = await child.status;

  assertEquals(code, 0);
  assertEquals(await exists(`${dir}/out_cli/_types.ts`), true);
  assertEquals(await exists(`${dir}/out_config`), false);

  await remove(dir, { recursive: true });
});

test("config: missing explicit config file errors", async () => {
  const dir = await makeTempDir({ prefix: "stc_config_" });
  const command = new Command(process.execPath, {
    args: ["--import", TSX_LOADER, MAIN_TS, "--config", "./nope.json"],
    cwd: dir,
  });
  const { code, stderr } = await command.output();

  assertEquals(code, 1);
  assertMatch(new TextDecoder().decode(stderr), /nope\.json/);

  await remove(dir, { recursive: true });
});

test("watch: local file change triggers regeneration", async () => {
  const dir = await makeTempDir({ prefix: "stc_watch_" });

  await writeTextFile(`${dir}/spec.json`, SPEC_V1);

  const child = runStc(
    ["-w", "--url=./spec.json", "-o", "out", "--shared=false"],
    dir,
  );

  try {
    await waitFor(
      () => exists(`${dir}/out/ping.ts`),
      30_000,
      "initial generation",
    );
    await sleep(1000);

    await writeTextFile(`${dir}/spec.json`, SPEC_V2);

    await waitFor(
      () => exists(`${dir}/out/pong.ts`),
      30_000,
      "regeneration after change",
    );
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      // 忽略
    }
    await child.status;
    await remove(dir, { recursive: true });
  }
});

test("watch: remote url polling triggers regeneration", async () => {
  let specContent = SPEC_V1;

  const server = await serve(
    { port: 0, hostname: "127.0.0.1" },
    () =>
      new Response(specContent, {
        headers: { "content-type": "application/json" },
      }),
  );
  const port = (server.addr as { port: number }).port;
  const dir = await makeTempDir({ prefix: "stc_watch_" });

  const child = runStc(
    [
      "-w",
      `--url=http://127.0.0.1:${port}/spec.json`,
      "-o",
      "out",
      "--shared=false",
      "--interval=1000",
    ],
    dir,
  );

  try {
    await waitFor(
      () => exists(`${dir}/out/ping.ts`),
      30_000,
      "initial generation",
    );
    // 等待 watcher 完成基准哈希请求
    await sleep(1500);

    specContent = SPEC_V2;

    await waitFor(
      () => exists(`${dir}/out/pong.ts`),
      30_000,
      "regeneration after remote change",
    );
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      // 忽略
    }
    await child.status;
    await server.shutdown();
    await remove(dir, { recursive: true });
  }
});
