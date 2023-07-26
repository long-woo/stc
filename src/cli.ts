import { Args, parse, type ParseOptions } from "std/flags/mod.ts";
import ProgressBar from "x/progress@v1.3.8/mod.ts";

import Logs from "./console.ts";
import { ISwaggerOptions } from "./swagger.ts";
import { createAppFile } from "./util.ts";
import denoJson from "/deno.json" assert { type: "json" };

/**
 * 检查更新并处理更新过程（如果有新版本可用）。
 *
 * @return {Promise<string>} 如果进行了更新，则返回最新版本，如果未找到更新，则返回当前版本。
 */
const checkUpdate = async (): Promise<string> => {
  Logs.info("检查更新...");
  const version = Number(denoJson.version?.replace(/\./g, "") ?? 0);

  const res = await fetch(
    "https://api.github.com/repos/long-woo/stc/releases/latest",
  );

  if (res.ok) {
    const data = await res.json();
    const latestVersion = data.tag_name;
    const _lastVersion = Number(latestVersion.replace(/\./g, "") ?? 0);

    if (version < _lastVersion) {
      Logs.info("发现新版本，正在更新中...");
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

        Logs.info(`更新完成，版本：v${latestVersion}`);
        return latestVersion;
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
      //   Logs.info("更新完成，请重新运行");
      //   return;
      // }

      // Logs.error(new TextDecoder().decode(stderr));
      return latestVersion;
    }

    Logs.info("已经是最新版本");
  }

  return denoJson.version;
};

/**
 * 打印帮助信息
 */
const printHelp = () => {
  console.log(`
使用:
  stc [options]

选项:
  -h, --help         显示帮助信息
  --url              远程地址或本地文件路径
  -o, --outDir       输出目录，默认为 Deno 当前执行的目录下 stc_out
  -p, --platform     平台，可选值：axios、wechat， [default: "axios"]
  -l, --lang         语言，用于输出文件的后缀名， [default: "ts"]
  -f, --filter       过滤接口，符合过滤条件的接口会被生成
  --tag              从接口 url 中指定标签，默认读取 tags 的第一个用于文件名
  -v, --version      显示版本信息

示例:
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
      Logs.error(`未知选项: ${arg}`);
      printHelp();
      Deno.exit(1);
    },
  };

  // 解析命令行参数和选项
  const args: Args = parse(Deno.args, argsConfig);

  // 检查更新
  const _version = await checkUpdate();

  // 帮助
  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  // 版本
  if (args.version) {
    console.log(`stc v${_version}`);
    Deno.exit(0);
  }

  // 检查 url
  if (!args.url) {
    Logs.error("必须提供选项 url");
    printHelp();
    Deno.exit(1);
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
