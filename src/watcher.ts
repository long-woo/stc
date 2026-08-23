import { dirname, resolve } from "@std/path";

import { start } from "./app.ts";
import Logs from "./console.ts";
import { getT } from "./i18n/index.ts";
import type { IMainResult } from "./cli.ts";
import type { DefaultConfigOptions } from "./swagger.ts";

/**
 * 远程地址判断
 */
const REMOTE_REG = /^http(s?):\/\//;

/**
 * 本地文件监听的防抖时间
 */
const DEBOUNCE_MS = 300;

/**
 * 解析符号链接，保证监听路径与事件路径一致（如 macOS 的 /tmp -> /private/tmp）
 * @param path - 路径
 */
const realPath = (path: string): string => {
  try {
    return Deno.realPathSync(path);
  } catch {
    return path;
  }
};

/**
 * 格式化错误信息
 * @param error - 错误
 */
const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/**
 * 执行一次生成，失败时仅输出错误，不中断监听
 * @param options - 配置
 */
export const runOnce = async (options: DefaultConfigOptions): Promise<void> => {
  try {
    await start(options);
  } catch (error) {
    Logs.error(
      getT("$t(watch.regenerateError)", { error: formatError(error) }),
    );
  }
};

/**
 * 计算文本的 SHA-256 哈希
 * @param text - 文本
 */
const hashText = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * 请求远程地址并计算内容哈希，失败时返回 undefined
 * @param url - 远程地址
 */
const fetchSpecHash = async (url: string): Promise<string | undefined> => {
  try {
    const res = await fetch(url);

    if (!res.ok) return undefined;

    return await hashText(await res.text());
  } catch {
    return undefined;
  }
};

/**
 * 本地文件监听结果
 */
interface ILocalWatcher {
  /**
   * 监听结果：spec 为 API 文档变化，config 为配置文件变化
   */
  promise: Promise<"spec" | "config">;
  /**
   * 提前取消监听
   */
  cancel: () => void;
}

/**
 * 监听本地文件变化（可同时监听 API 文档和配置文件）
 *
 * @param targets - 监听目标，路径需为绝对路径
 */
const watchLocalFiles = (
  targets: { spec: string; config?: string },
): ILocalWatcher => {
  const watchDirs = [
    ...new Set(
      [targets.spec, targets.config]
        .filter(Boolean)
        .map((path) => dirname(path as string)),
    ),
  ];
  const watcher = Deno.watchFs(watchDirs);

  const closeWatcher = () => {
    try {
      watcher.close();
    } catch {
      // 忽略重复关闭产生的错误
    }
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  let kind: "spec" | "config" = "spec";
  let resolvePromise!: (kind: "spec" | "config") => void;

  const promise = new Promise<"spec" | "config">((resolve) => {
    resolvePromise = resolve;
  });

  // 防抖，避免编辑器保存时触发多次
  const settle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (settled) return;

      settled = true;
      closeWatcher();
      resolvePromise(kind);
    }, DEBOUNCE_MS);
  };

  const cancel = () => {
    if (settled) return;

    settled = true;
    clearTimeout(timer);
    closeWatcher();
  };

  (async () => {
    try {
      for await (const event of watcher) {
        if (settled) break;
        // 配置文件删除后也需要重新加载，以便回退到默认配置或其他候选文件。
        if (event.kind === "access") continue;

        const matchedConfig = Boolean(targets.config) &&
          event.paths.some((path) => path === targets.config);
        const matchedSpec = event.paths.some((path) => path === targets.spec);

        if (!matchedConfig && !matchedSpec) continue;

        // 配置文件变化优先，因为重新加载配置后也会重新生成
        if (matchedConfig) {
          kind = "config";
        } else if (kind !== "config") {
          kind = "spec";
        }

        settle();
      }
    } catch {
      // 忽略 watcher 关闭产生的错误
    }
  })();

  return { promise, cancel };
};

/**
 * 等待远程地址内容变化（轮询），同时监听本地配置文件变化
 *
 * @param url - 远程地址
 * @param intervalMs - 轮询间隔（毫秒）
 * @param configPath - 本地配置文件路径（可选）
 */
const waitForRemoteChange = async (
  url: string,
  intervalMs: number,
  configPath?: string,
): Promise<"spec" | "config"> => {
  // 以监听开始时的内容作为基准
  const baseline = await fetchSpecHash(url);

  return await new Promise<"spec" | "config">((resolvePromise) => {
    let settled = false;
    let configWatcher: ILocalWatcher | undefined;

    const finish = (kind: "spec" | "config") => {
      if (settled) return;

      settled = true;
      clearInterval(timer);
      configWatcher?.cancel();
      resolvePromise(kind);
    };

    const timer = setInterval(async () => {
      const hash = await fetchSpecHash(url);

      if (hash && hash !== baseline) {
        finish("spec");
      }
    }, intervalMs);

    if (configPath) {
      // 复用本地监听器，但明确标记为配置文件，避免误判为 spec 变化。
      configWatcher = watchLocalFiles({
        spec: configPath,
        config: configPath,
      });
      configWatcher.promise
        .then(() => finish("config"))
        .catch(() => {});
    }
  });
};

/**
 * 启动监听模式
 *
 * @param initial - 初始选项和配置文件路径
 * @param reload - 重新解析选项（配置文件变化时调用）
 */
export const startWatch = async (
  initial: IMainResult,
  reload: () => Promise<IMainResult>,
): Promise<void> => {
  try {
    Deno.addSignalListener("SIGINT", () => {
      console.log("");
      Logs.info(getT("$t(watch.stop)"));
      Deno.exit(0);
    });
  } catch {
    // 部分环境不支持 SIGINT 监听
  }

  let current = initial;

  // 配置文件变化时重新加载选项，需要重启监听，因此使用循环
  while (true) {
    const { options, configPath } = current;
    const remote = REMOTE_REG.test(options.url);
    const absoluteConfigPath = configPath
      ? resolve(Deno.cwd(), configPath)
      : undefined;

    Logs.info(getT("$t(watch.start)"));

    if (remote) {
      Logs.info(
        getT("$t(watch.pollRemote)", {
          interval: Math.round((options.interval ?? 3000) / 1000),
        }),
      );
    }

    const kind = remote
      ? await waitForRemoteChange(
        options.url,
        options.interval ?? 3000,
        absoluteConfigPath ? realPath(absoluteConfigPath) : undefined,
      )
      : await watchLocalFiles({
        spec: realPath(resolve(Deno.cwd(), options.url)),
        config: absoluteConfigPath ? realPath(absoluteConfigPath) : undefined,
      }).promise;

    if (kind === "config") {
      Logs.info(getT("$t(watch.configChanged)"));

      current = await reload();

      // 新配置关闭了监听
      if (!current.options.watch) return;

      await runOnce(current.options);
      continue;
    }

    Logs.info(getT("$t(watch.changeDetected)"));
    await runOnce(options);
  }
};
