import { dirname, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { watch } from "chokidar";
import { start } from "./app.ts";
import Logs from "./console.ts";
import { getT } from "./i18n/index.ts";
import type { IMainResult } from "./cli.ts";
import type { DefaultConfigOptions } from "./swagger.ts";

const realPath = (path: string) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};
const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
export const runOnce = async (options: DefaultConfigOptions): Promise<void> => {
  try {
    await start(options);
  } catch (error) {
    Logs.error(
      getT("$t(watch.regenerateError)", { error: formatError(error) }),
    );
  }
};
const fetchSpecHash = async (url: string, signal: AbortSignal) => {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    });
    if (!res.ok) return undefined;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(await res.text()),
    );
    return Buffer.from(digest).toString("hex");
  } catch {
    return undefined;
  }
};

export const waitForChange = async (
  options: DefaultConfigOptions,
  configPath: string | undefined,
  signal: AbortSignal,
): Promise<"spec" | "config" | undefined> => {
  const requests = new AbortController();
  const requestSignal = AbortSignal.any([signal, requests.signal]);
  const remote = /^https?:\/\//.test(options.url);
  const spec = realPath(resolve(options.url));
  const config = configPath ? realPath(resolve(configPath)) : undefined;
  const dirs = [
    ...new Set(
      [
        remote ? undefined : dirname(spec),
        config ? dirname(config) : undefined,
      ].filter((p): p is string => !!p),
    ),
  ];
  const watcher = dirs.length
    ? watch(dirs, { ignoreInitial: true, depth: 0 })
    : undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let kind: "spec" | "config" = "spec";
  let finished = false;
  let finish!: (value: "spec" | "config" | undefined) => void;
  const result = new Promise<"spec" | "config" | undefined>((r) => {
    finish = (value) => {
      if (!finished) {
        finished = true;
        r(value);
      }
    };
  });
  const abort = () => finish(undefined);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  watcher?.on("all", (_event, path) => {
    path = realPath(resolve(path));
    if (path !== config && (remote || path !== spec)) return;
    if (path === config) kind = "config";
    clearTimeout(timer);
    timer = setTimeout(() => finish(kind), 300);
  });
  watcher?.on("error", (error) => {
    Logs.error(formatError(error));
    finish(undefined);
  });
  const poll = async () => {
    const baseline = await fetchSpecHash(options.url, requestSignal);
    const next = async () => {
      if (finished || signal.aborted) return;
      const hash = await fetchSpecHash(options.url, requestSignal);
      if (hash && hash !== baseline) finish("spec");
      else if (!finished)
        pollTimer = setTimeout(next, options.interval ?? 3000);
    };
    if (!finished) pollTimer = setTimeout(next, options.interval ?? 3000);
  };
  if (remote) void poll();
  try {
    return await result;
  } finally {
    requests.abort();
    clearTimeout(timer);
    clearTimeout(pollTimer);
    signal.removeEventListener("abort", abort);
    await watcher?.close();
  }
};

export const startWatch = async (
  initial: IMainResult,
  reload: () => Promise<IMainResult>,
): Promise<void> => {
  const controller = new AbortController();
  const stop = () => {
    Logs.info(getT("$t(watch.stop)"));
    controller.abort();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  let current = initial;
  try {
    while (!controller.signal.aborted) {
      Logs.info(getT("$t(watch.start)"));
      const kind = await waitForChange(
        current.options,
        current.configPath,
        controller.signal,
      );
      if (!kind) break;
      if (kind === "config") {
        Logs.info(getT("$t(watch.configChanged)"));
        try {
          current = await reload();
        } catch (error) {
          Logs.error(formatError(error));
          continue;
        }
        if (!current.options.watch) break;
      } else Logs.info(getT("$t(watch.changeDetected)"));
      await runOnce(current.options);
    }
  } finally {
    controller.abort();
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
};
