import { assertEquals, assertMatch } from "@std/assert";
import { exists } from "@std/fs";
import {
  loadConfigFile,
  normalizeConfig,
  parseConfigContent,
} from "../src/config.ts";

const REPO_ROOT = Deno.cwd();
const MAIN_TS = `${REPO_ROOT}/src/main.ts`;
const DENO_JSON = `${REPO_ROOT}/deno.json`;

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

const runStc = (
  args: string[],
  cwd: string,
): Deno.ChildProcess => {
  const command = new Deno.Command("deno", {
    args: ["run", "-A", "--config", DENO_JSON, MAIN_TS, ...args],
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

Deno.test("config: parseConfigContent", () => {
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

Deno.test("config: normalizeConfig", () => {
  const options = normalizeConfig({
    filter: "/pet*",
    globalHeader: "Authorization",
    interval: "5000",
  });

  assertEquals(options.filter, ["/pet*"]);
  assertEquals(options.globalHeader, ["Authorization"]);
  assertEquals(options.interval, 5000);
});

Deno.test("config: loadConfigFile with explicit path", async () => {
  const dir = await Deno.makeTempDir({ prefix: "stc_config_" });
  const path = `${dir}/my.json`;

  await Deno.writeTextFile(path, JSON.stringify({ lang: "js" }));

  const loaded = await loadConfigFile(path);

  assertEquals(loaded.path, path);
  assertEquals(loaded.options.lang, "js");

  const missing = await loadConfigFile(`${dir}/nope.json`);

  assertEquals(missing.path, undefined);
  assertEquals(missing.options, {});

  await Deno.remove(dir, { recursive: true });
});

Deno.test("config: auto discovery and generation", async () => {
  const dir = await Deno.makeTempDir({ prefix: "stc_config_" });

  await Deno.writeTextFile(
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

  await Deno.remove(dir, { recursive: true });
});

Deno.test("config: ts config file", async () => {
  const dir = await Deno.makeTempDir({ prefix: "stc_config_" });

  await Deno.writeTextFile(
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

  await Deno.remove(dir, { recursive: true });
});

Deno.test("config: cli args override config file", async () => {
  const dir = await Deno.makeTempDir({ prefix: "stc_config_" });

  await Deno.writeTextFile(
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

  await Deno.remove(dir, { recursive: true });
});

Deno.test("config: missing explicit config file errors", async () => {
  const dir = await Deno.makeTempDir({ prefix: "stc_config_" });
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "--config",
      DENO_JSON,
      MAIN_TS,
      "--config",
      "./nope.json",
    ],
    cwd: dir,
  });
  const { code, stderr } = await command.output();

  assertEquals(code, 1);
  assertMatch(
    new TextDecoder().decode(stderr),
    /nope\.json/,
  );

  await Deno.remove(dir, { recursive: true });
});

/**
 * 探测当前环境是否支持 Deno.watchFs 事件
 */
const watchFsWorks = async (): Promise<boolean> => {
  const dir = await Deno.makeTempDir({ prefix: "stc_watchfs_" });
  const file = `${dir}/probe.txt`;

  await Deno.writeTextFile(file, "init");

  const watcher = Deno.watchFs(file);
  let gotEvent = false;

  const loop = (async () => {
    for await (const _event of watcher) {
      gotEvent = true;
      break;
    }
  })();

  const timer = setTimeout(() => {
    Deno.writeTextFile(file, "changed").catch(() => {
      // 文件可能已被清理
    });
  }, 200);
  await Promise.race([loop, sleep(2500)]);
  clearTimeout(timer);

  try {
    watcher.close();
  } catch {
    // 忽略
  }
  await Deno.remove(dir, { recursive: true });

  return gotEvent;
};

/**
 * 探测当前环境是否允许监听本地端口
 */
const canBindLocalhost = async (): Promise<boolean> => {
  try {
    const server = Deno.serve(
      { port: 0, hostname: "127.0.0.1" },
      () => new Response("ok"),
    );

    await server.shutdown();

    return true;
  } catch {
    return false;
  }
};

Deno.test({
  name: "watch: local file change triggers regeneration",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    if (!await watchFsWorks()) {
      console.log("skip: Deno.watchFs is not available in this environment");
      return;
    }

    const dir = await Deno.makeTempDir({ prefix: "stc_watch_" });

    await Deno.writeTextFile(`${dir}/spec.json`, SPEC_V1);

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

      await Deno.writeTextFile(`${dir}/spec.json`, SPEC_V2);

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
      await Deno.remove(dir, { recursive: true });
    }
  },
});

Deno.test({
  name: "watch: remote url polling triggers regeneration",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    if (!await canBindLocalhost()) {
      console.log(
        "skip: binding localhost is not allowed in this environment",
      );
      return;
    }

    let specContent = SPEC_V1;

    const server = Deno.serve(
      { port: 0, hostname: "127.0.0.1" },
      () =>
        new Response(specContent, {
          headers: { "content-type": "application/json" },
        }),
    );
    const port = (server.addr as Deno.NetAddr).port;
    const dir = await Deno.makeTempDir({ prefix: "stc_watch_" });

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
      await Deno.remove(dir, { recursive: true });
    }
  },
});
