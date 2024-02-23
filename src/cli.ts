import { Args, parse, type ParseOptions } from "std/flags/mod.ts";
import ProgressBar from "x/progress@v1.3.8/mod.ts";

import Logs from "./console.ts";
import { ISwaggerOptions } from "./swagger.ts";
import { createAppFile } from "./util.ts";
import denoJson from "/deno.json" with { type: "json" };
import { getT } from "./i18n/index.ts";

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
      Logs.info(
        `${
          getT("$t(cli.newVersion)", {
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
        Deno.exit(1);
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
  -o, --outDir       ${getT("$t(cli.option_out)", { out: "stc_out" })}
  -p, --platform     ${getT("$t(cli.option_platform)")}
  -l, --lang         ${getT("$t(cli.option_lang)")}
  -f, --filter       ${getT("$t(cli.option_filter)")}
  --tag              ${getT("$t(cli.option_tag)")}
  -v, --version      ${getT("$t(cli.option_version)")}

${getT("$t(cli.example)")}
  stc -o ./stc_out --url http://petstore.swagger.io/v2/swagger.json
  stc -o ./stc_out -p axios -l ts --url http://petstore.swagger.io/v2/swagger.json
`);
  Deno.exit(0);
};

/**
 * 主入口
 */
export const main = async (): Promise<ISwaggerOptions> => {
  // 定义命令行参数和选项的配置
  const argsConfig: ParseOptions = {
    boolean: ["help", "version"],
    string: [
      "url",
      "outDir",
      "platform",
      "lang",
      "tag",
      "filter",
    ],
    alias: {
      h: "help",
      o: "outDir",
      p: "platform",
      l: "lang",
      v: "version",
      f: "filter",
    },
    collect: ["filter"],
    default: {
      lang: "ts",
      platform: "axios",
    },
    unknown: (arg: string) => {
      Logs.error(getT("$t(cli.unknownOption)", { arg }));
      printHelp();
      Deno.exit(1);
    },
  };

  // 解析命令行参数和选项
  const args: Args = parse(Deno.args, argsConfig);

  // 检查更新
  await checkUpdate();

  // 帮助
  if (args.help) {
    printHelp();
  }

  // 版本
  if (args.version) {
    console.log(`stc v${denoJson.version}`);
    Deno.exit(0);
  }

  // 检查 url
  if (!args.url) {
    Logs.error(getT("$t(cli.requiredUrl)"));
    printHelp();
  }

  // 文件输出目录，默认为 Deno 当前执行的目录
  let outDir = `${Deno.cwd()}/stc_out`;

  // 若没有提供 out 选项，则使用 Deno 当前执行的目录
  if (typeof args.outDir === "string" && args.outDir) {
    outDir = args.outDir;
  }

  // 平台。axios、wechat
  const platform = args.platform ?? "axios";
  // 语言，用于输出文件的后缀名。默认：ts
  const lang = args.lang ?? "ts";

  return {
    url: args.url,
    outDir,
    platform,
    lang,
    tag: args.tag,
    filter: args.filter,
  };
};
