import fastDiff from "fast-diff";
import type { DefaultConfigOptions, ISwaggerResult } from "./swagger.ts";
import type { IPluginContext } from "./plugins/typeDeclaration.ts";
import Logs from "./console.ts";
import { PluginManager } from "./plugins/index.ts";
import { getApiPath, getDefinition } from "./core.ts";
import { createFile, emptyDirectory, readFile, removeFile } from "./utils.ts";
import { getT } from "./i18n/index.ts";

/**
 * 初始化插件管理器
 */
const initPluginManager = (context: IPluginContext) => {
  const pluginManager = new PluginManager();

  // 注册插件
  pluginManager.register([
    ...(context.options.plugins ?? []),
  ]);
  // 启动所有插件
  pluginManager.setupAll(context);
};

/**
 * 创建上下文
 * @param options
 */
const createContext = (context: IPluginContext) => {
  // 初始化插件管理器
  initPluginManager(context);

  return context;
};

/**
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns
 */
const getData = async (urlOrPath: string): Promise<ISwaggerResult> => {
  try {
    if (!/^http(s?):\/\//.test(urlOrPath)) {
      const content = await readFile(urlOrPath);

      return JSON.parse(content) as unknown as ISwaggerResult;
    }

    // 从远程地址获取 Swagger 数据
    const res = await fetch(urlOrPath);
    const data = await res.json();

    return data;
  } catch (error) {
    throw new Error(getT("$t(app.apiJsonFileError)", { error }));
  }
};

/**
 * 启动
 * @param options - 配置
 */
export const start = async (options: DefaultConfigOptions): Promise<void> => {
  // 创建上下文
  const context = createContext({ options });

  const data = await getData(options.url);

  // 触发插件 onload 事件
  context.onLoad?.(data, context.options);

  // 处理类型定义。v2 版本中，通过 `definitions` 属性获取。而 v3 版本，则通过 `components.schemas` 属性获取。
  const defData = getDefinition(data.definitions || data.components?.schemas);
  // 触发插件 onDefinition 事件
  context.onDefinition?.(defData, context.options);

  const actionData = getApiPath(data.paths, options);
  // 触发插件 onAction 事件
  context.onAction?.(actionData, context.options);

  if (options.clean) {
    if (options.shared) {
      // 清空输出目录
      await emptyDirectory(options.outDir);
    } else {
      await removeFile(`${options.outDir}/**/*.*`, {
        exclude: [`${options.outDir}/shared/**/*`],
      });
    }
  }

  // 触发插件 onTransform 事件
  const transformData = await context.onTransform?.(
    defData,
    actionData,
    context.options,
  );

  // 写入类型定义文件
  if (transformData?.definition?.content) {
    const name = `${options.outDir}/${transformData.definition.filename}`;
    const newContent = transformData.definition.content;

    const oldContent = await readFile(name);
    console.log(
      oldContent.match(
        /^\/\*\*.+\*\s+\*\s+`?https:\/\/github\.com\/long-woo\/stc`?\s+\*\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+\*\//s,
      ),
    );
    createFile(name, newContent);
  }

  // 写入 API 文件
  if (transformData?.action) {
    transformData.action.forEach((content, filename) => {
      createFile(
        `${options.outDir}/${filename}`,
        content,
      );
    });
  }

  console.log("\n");
  Logs.success(`${getT("$t(app.generateFileDone)")}\n\t${options.outDir}\n`);
  // 触发插件 onEnd 事件
  context.onEnd?.(context.options);
};
