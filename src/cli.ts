import { type Args, parseArgs, type ParseOptions } from "@std/cli";
import ProgressBar from "@deno-library/progress";

import type { DefaultConfigOptions, IDefaultObject } from "./swagger.ts";
import { loadConfigFile, normalizeConfig } from "./config.ts";
import Logs from "./console.ts";
import { createAppFile } from "./utils.ts";
import denoJson from "../deno.json" with { type: "json" };
import { getT } from "./i18n/index.ts";
import { trackEvent } from "./ga.ts";
import { dirname, resolve } from "@std/path";

const drawLogo = () => {
  console.log(`
  __________ _______ ___
 / _____|_______|_______)
( (____     _    _      
 \\____ \\   | |  | |      
 _____) )  | |  | |_____ 
(______/   |_|   \\______)
  `);
};

/**
 * 检查更新并处理更新过程（如果有新版本可用）。
 *
 * @return {Promise<string>} 如果进行了更新，则返回最新版本，如果未找到更新，则返回当前版本。
 */
const checkUpdate = async () => {
  Logs.info(`${getT("$t(cli.checkUpdate)")}...`);
  const version = Number(denoJson.version?.replace(/\./g, "") ?? 0);

  const res = await fetch(
    "https://api.github.com/repos/long-woo/stc/releases/latest",
    // { timeout: 1000 * 60 * 10 },
  );

  if (res.ok) {
    const data = await res.json();
    const latestVersion = data.tag_name;
    const _lastVersion = Number(latestVersion.replace(/\./g, "") ?? 0);

    if (version < _lastVersion) {
      // 非 deno compile 的可执行文件，仅提示更新
      if (typeof confirm === "undefined") {
        // 提示有新版本
        console.log("\n");
        Logs.warn(getT("$t(cli.updatePrompt)", {
          version: denoJson.version,
          latestVersion,
        }));
        console.log("\n");
        return;
      }

      // 询问是否更新
      const _needUpdate = confirm(`${
        getT("$t(cli.updatePrompt)", {
          version: denoJson.version,
          latestVersion,
        })
      }${getT("$t(cli.updateConfirm)")}`);

      if (!_needUpdate) return;

      Logs.info(
        `${
          getT("$t(cli.updating)", {
            version: denoJson.version,
            latestVersion,
          })
        }...`,
      );

      const dir = Deno.cwd();
      const systemInfo = Deno.build;

      const appNameMap: Record<string, string> = {
        "x86_64-apple-darwin": "stc",
        "aarch64-apple-darwin": "stc-m",
        "x86_64-pc-windows-msvc": "stc-win",
        "x86_64-unknown-linux-gnu": "stc-linux",
      };
      const downloadUrl =
        `https://github.com/long-woo/stc/releases/download/${latestVersion}/${
          appNameMap[systemInfo.target]
        }`;
      const downloadApp = await fetch(downloadUrl);

      const reader = downloadApp.body?.getReader();
      // 文件内容长度
      const contentLength = Number(downloadApp.headers.get("content-length"));
      const size = Number((contentLength / 1024 / 1024).toFixed(1));
      // 接收的文件字节长度
      let receivedLength = 0;
      // 接收到的字节数据
      const chunks: Uint8Array[] = [];

      if (reader) {
        const progressBar = new ProgressBar({
          total: size,
          display: ":completed/:total M :bar :percent",
        });

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          progressBar.render(Number((receivedLength / 1024 / 1024).toFixed(1)));
        }

        const chunkContent = new Uint8Array(receivedLength);
        let offset = 0;

        for (const chunk of chunks) {
          chunkContent.set(chunk, offset);
          offset += chunk.length;
        }

        await createAppFile(
          `${dir}/stc`,
          chunkContent.buffer,
        );

        Logs.success(getT("$t(cli.updateDone)", { version: latestVersion }));
        Deno.exit(0);
      }

      Logs.error(downloadApp.statusText);

      // const command = new Deno.Command("deno", {
      //   args: [
      //     "compile",
      //     "-A",
      //     `https://deno.land/x/stc@${latestVersion}/mod.ts`,
      //     "--output",
      //     `${dir}/stc`,
      //   ],
      // });

      // const { code, stderr } = await command.output();

      // if (code === 0) {
      //   Logs.info("更新完成");
      //   return;
      // }

      // Logs.error(new TextDecoder().decode(stderr));
    }

    Logs.info(getT("$t(cli.latestVersion)"));
  }
};

/**
 * 打印帮助信息
 */
const printHelp = () => {
  console.log(`
${getT("$t(cli.usage)")}
  stc [options]

${getT("$t(cli.option)")}
  -h, --help         ${getT("$t(cli.option_help)")}
  --url              ${getT("$t(cli.option_url)")}
  -o, --outDir       ${getT("$t(cli.option_out)", { out: "./stc_out" })}
  --client           ${getT("$t(cli.option_client)")}
  -l, --lang         ${getT("$t(cli.option_lang)")}
  --mcp              ${getT("$t(cli.option_mcp)")}
  -f, --filter       ${getT("$t(cli.option_filter)")}
  --tag              ${getT("$t(cli.option_tag)")}
  -c, --conjunction  ${getT("$t(cli.option_conjunction)")}
  --actionIndex      ${getT("$t(cli.option_actionIndex)")}
  --shared           ${getT("$t(cli.option_shared)")}
  --clean            ${getT("$t(cli.option_clean)")}
  --globalHeader, --gh  ${getT("$t(cli.option_globalHeader)")}
  --noDeprecated     ${getT("$t(cli.option_noDeprecated)")}
  --config           ${getT("$t(cli.option_config)")}
  -w, --watch        ${getT("$t(cli.option_watch)")}
  --interval         ${getT("$t(cli.option_interval)")}
  -v, --version      ${getT("$t(cli.option_version)")}

${getT("$t(cli.example)")}
  stc -o ./stc_out --url http://petstore.swagger.io/v2/swagger.json
  stc -o ./stc_out -p axios -l ts --url https://petstore3.swagger.io/api/v3/openapi.json
  stc --config ./stc.config.json
  stc -w --url https://petstore3.swagger.io/api/v3/openapi.json
  stc --mcp --url ./openapi.yaml
`);
  Deno.exit(0);
};

/**
 * 支持合并的选项名（配置文件与 CLI 通用）
 */
const OPTION_KEYS = [
  "url",
  "outDir",
  "client",
  "lang",
  "mcp",
  "tag",
  "filter",
  "conjunction",
  "actionIndex",
  "shared",
  "clean",
  "globalHeader",
  "noDeprecated",
  "watch",
  "interval",
] as const;

/**
 * 选项默认值
 */
const OPTION_DEFAULTS: IDefaultObject = {
  outDir: "./stc_out",
  lang: "ts",
  client: "axios",
  conjunction: "By",
  actionIndex: "-1",
  shared: true,
  clean: true,
  watch: false,
  mcp: false,
  interval: 3000,
};

const OPTION_ALIASES: Record<string, string[]> = {
  watch: ["w"],
};

/**
 * 判断 CLI 是否显式传入了某个选项。`parseArgs` 会为未传入的布尔选项返回
 * false，因此需要结合原始参数区分“未指定”和“明确指定 false”。
 */
const hasCliOption = (name: string): boolean => {
  const names = [name, ...(OPTION_ALIASES[name] ?? [])];

  return Deno.args.some((arg) =>
    names.some((item) =>
      arg === `--${item}` || arg.startsWith(`--${item}=`) ||
      arg === `-${item}` || arg.startsWith(`-${item}=`)
    )
  );
};

/**
 * main 方法的返回结果
 */
export interface IMainResult {
  options: DefaultConfigOptions;
  /**
   * 实际加载的配置文件路径，未加载时为 undefined
   */
  configPath?: string;
}

/**
 * 解析 CLI 参数并加载配置文件，合并得到最终选项。
 * 优先级：CLI 参数 > 配置文件 > 默认值
 */
export const resolveOptions = async (): Promise<IMainResult> => {
  // 定义命令行参数和选项的配置
  const argsConfig: ParseOptions = {
    boolean: [
      "help",
      "version",
      "shared",
      "clean",
      "noDeprecated",
      "watch",
      "mcp",
    ],
    string: [
      "url",
      "outDir",
      "client",
      "lang",
      "tag",
      "filter",
      "conjunction",
      "actionIndex",
      "globalHeader",
      "config",
      "interval",
    ],
    alias: {
      h: "help",
      o: "outDir",
      l: "lang",
      v: "version",
      f: "filter",
      c: "conjunction",
      gh: "globalHeader",
      nd: "noDeprecated",
      w: "watch",
    },
    collect: ["filter", "globalHeader"],
    unknown: (arg: string) => {
      Logs.error(getT("$t(cli.unknownOption)", { arg }));
      printHelp();
      Deno.exit(1);
    },
  };

  // 不带默认值解析，便于识别用户实际传入的选项
  const args: Args = parseArgs(Deno.args, argsConfig);

  // 帮助
  if (args.help) {
    printHelp();
  }

  // 版本
  if (args.version) {
    console.log(`stc v${denoJson.version}`);
    Deno.exit(0);
  }

  // 加载配置文件
  const explicitConfig = args.config as string | undefined;
  let configPath: string | undefined;
  let fileOptions: IDefaultObject = {};

  try {
    const loaded = await loadConfigFile(explicitConfig);

    configPath = loaded.path;
    fileOptions = normalizeConfig(loaded.options);
  } catch (error) {
    Logs.error(getT("$t(cli.configLoadError)", {
      error: error instanceof Error ? error.message : String(error),
    }));
    Deno.exit(1);
  }

  // 显式指定了配置文件但不存在
  if (explicitConfig && !configPath) {
    Logs.error(getT("$t(cli.configNotFound)", { path: explicitConfig }));
    Deno.exit(1);
  }

  // 忽略配置文件中不支持的选项
  Object.keys(fileOptions).forEach((key) => {
    if (!(OPTION_KEYS as readonly string[]).includes(key)) {
      Logs.warn(getT("$t(cli.configUnknownKey)", { key }));
      delete fileOptions[key];
    }
  });

  // 合并：默认值 < 配置文件 < CLI 参数
  const merged: IDefaultObject = { ...OPTION_DEFAULTS };

  Object.entries(fileOptions).forEach(([key, value]) => {
    if (value !== undefined) merged[key] = value;
  });

  OPTION_KEYS.forEach((key) => {
    const value = args[key];

    if (value === undefined) return;
    if (typeof value === "boolean" && !hasCliOption(key)) return;
    // collect 选项未传入时 parseArgs 会返回空数组，视为未指定
    if (Array.isArray(value) && value.length === 0) return;

    merged[key] = value;
  });

  if (merged.mcp) {
    merged.lang = "mcp";
  }

  // 配置文件中的本地路径相对于配置文件所在目录解析；CLI 显式传入的路径仍相对于当前目录。
  if (configPath) {
    const configDirectory = dirname(resolve(Deno.cwd(), configPath));

    if (
      args.url === undefined && typeof merged.url === "string" &&
      !/^https?:\/\//i.test(merged.url)
    ) {
      merged.url = resolve(configDirectory, merged.url);
    }

    if (args.outDir === undefined && typeof merged.outDir === "string") {
      merged.outDir = resolve(configDirectory, merged.outDir);
    }
  }

  // 轮询间隔最小 1 秒
  merged.interval = Math.max(Number(merged.interval) || 3000, 1000);

  // 检查 url
  if (!merged.url) {
    Logs.error(getT("$t(cli.requiredUrl)"));
    printHelp();
  }

  trackEvent("cli_options", {
    client: merged.client,
    lang: merged.lang,
    version: denoJson.version,
    config: Boolean(configPath),
    watch: Boolean(merged.watch),
  });

  return {
    options: {
      url: merged.url as string,
      outDir: merged.outDir as string,
      client: merged.client as DefaultConfigOptions["client"],
      lang: merged.lang as string,
      mcp: merged.mcp as boolean,
      tag: merged.tag as DefaultConfigOptions["tag"],
      filter: merged.filter as string[] | undefined,
      conjunction: merged.conjunction as string,
      actionIndex: merged.actionIndex as DefaultConfigOptions["actionIndex"],
      shared: merged.shared as boolean,
      clean: merged.clean as boolean,
      globalHeader: merged.globalHeader as string[] | undefined,
      noDeprecated: merged.noDeprecated as boolean,
      watch: merged.watch as boolean,
      interval: merged.interval as number,
    },
    configPath,
  };
};

/**
 * 主入口
 */
export const main = async (): Promise<IMainResult> => {
  // 清空控制台信息
  Logs.clear();
  drawLogo();

  // 检查更新（检查失败不影响正常生成）
  try {
    await checkUpdate();
  } catch {
    // 忽略更新检查错误
  }

  return resolveOptions();
};
