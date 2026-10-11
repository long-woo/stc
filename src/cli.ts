import { parseArgs, type Args, type ParseOptions } from "./args.ts";

import type { DefaultConfigOptions, IDefaultObject } from "./swagger.ts";
import { loadConfigFile, normalizeConfig } from "./config.ts";
import Logs from "./console.ts";
import packageJson from "../package.json" with { type: "json" };
import { getT } from "./i18n/index.ts";
import { trackEvent } from "./ga.ts";
import { isNewerVersion } from "./version.ts";
import { dirname, resolve } from "node:path";

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
  const res = await fetch(
    "https://api.github.com/repos/long-woo/stc/releases/latest",
    { signal: AbortSignal.timeout(3000) },
  );
  if (!res.ok) return;
  const data = (await res.json()) as { tag_name?: string };
  const latestVersion = data.tag_name?.replace(/^v/, "");
  if (!latestVersion) return;
  if (isNewerVersion(latestVersion, packageJson.version)) {
    Logs.warn(
      getT("$t(cli.updatePrompt)", {
        version: packageJson.version,
        latestVersion,
      }),
    );
    console.log("https://github.com/long-woo/stc/releases/latest");
    console.log("npm install -g @lonu/stc@latest");
  } else Logs.info(getT("$t(cli.latestVersion)"));
};

/**
 * 打印帮助信息
 */
const printHelp = (code = 0) => {
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
  process.exit(code);
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
  noDeprecated: ["nd"],
};

/**
 * 判断 CLI 是否显式传入了某个选项。`parseArgs` 会为未传入的布尔选项返回
 * false，因此需要结合原始参数区分“未指定”和“明确指定 false”。
 */
const hasCliOption = (name: string): boolean => {
  const names = [name, ...(OPTION_ALIASES[name] ?? [])];

  return process.argv
    .slice(2)
    .some((arg) =>
      names.some(
        (item) =>
          arg === `--${item}` ||
          arg.startsWith(`--${item}=`) ||
          arg === `-${item}` ||
          arg.startsWith(`-${item}=`),
      ),
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
      throw new Error(getT("$t(cli.unknownOption)", { arg }));
    },
  };

  // 不带默认值解析，便于识别用户实际传入的选项
  const args: Args = parseArgs(process.argv.slice(2), argsConfig);

  // 帮助
  if (args.help) {
    printHelp();
  }

  // 版本
  if (args.version) {
    console.log(`stc v${packageJson.version}`);
    process.exit(0);
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
    throw new Error(
      getT("$t(cli.configLoadError)", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  if (explicitConfig && !configPath) {
    throw new Error(getT("$t(cli.configNotFound)", { path: explicitConfig }));
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
    const configDirectory = dirname(resolve(process.cwd(), configPath));

    if (
      args.url === undefined &&
      typeof merged.url === "string" &&
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
    throw new Error(getT("$t(cli.requiredUrl)"));
  }

  trackEvent("cli_options", {
    client: merged.client,
    lang: merged.lang,
    version: packageJson.version,
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
    if (
      !process.env.STC_SKIP_UPDATE_CHECK &&
      !process.argv
        .slice(2)
        .some((arg) => ["--help", "-h", "--version", "-v"].includes(arg))
    )
      await checkUpdate();
  } catch {
    // 忽略更新检查错误
  }

  return resolveOptions();
};
