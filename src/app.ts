import Logs from "./console.ts";
import { PluginManager } from "./plugins/index.ts";
import { IPluginContext } from "./plugins/typeDeclaration.ts";
import { getDefinition } from "./definition.ts";
import { getApiPath } from "./path.ts";
import { ISwaggerOptions, ISwaggerResult } from "./swagger.ts";
import { createFile, emptyDirectory, readFile } from "./util.ts";
import { getT } from "./i18n/index.ts";

/**
 * 创建上下文
 * @param options
 */
const createContext = (context: IPluginContext) => context;

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
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns
 */
const getData = async (urlOrPath: string): Promise<ISwaggerResult> => {
  if (!/^http(s?):\/\//.test(urlOrPath)) {
    const content = await readFile(urlOrPath);

    try {
      return JSON.parse(content) as unknown as ISwaggerResult;
    } catch (error) {
      throw new Error(getT("$t(app.apiJsonFileError)", { error }));
    }
  }

  // 从远程地址获取 Swagger 数据
  const res = await fetch(urlOrPath);
  const data = await res.json();

  return data;
};

/**
 * 启动
 * @param options - 配置
 */
export const start = async (options: ISwaggerOptions) => {
  // 创建上下文
  const context = createContext({ options });

  // 清空控制台信息
  Logs.clear();

  // 初始化插件管理器
  initPluginManager(context);

  const data = await getData(options.url);
  // 触发插件 onload 事件
  context.onLoad?.(data);

  // 处理类型定义。v2 版本中，通过 `definitions` 属性获取。而 v3 版本，则通过 `components.schemas` 属性获取。
  const defData = getDefinition(data.definitions || data.components?.schemas);
  // 触发插件 onDefinition 事件
  context.onDefinition?.(defData);

  const actionData = getApiPath(data.paths, options);
  // 触发插件 onAction 事件
  context.onAction?.(actionData);

  // 清空输出目录
  await emptyDirectory(options.outDir);

  // 触发插件 onTransform 事件
  const transformData = context.onTransform?.(defData, actionData);

  // 写入类型定义文件
  if (transformData?.definition) {
    createFile(
      `${options.outDir}/${transformData.definition.filename}`,
      transformData.definition.content,
    );
  }

  // 写入 API 文件
  if (transformData?.action) {
    transformData.action.forEach((content, filename) => {
      createFile(
        `${options.outDir}/${filename}.${options.lang}`,
        content,
      );
    });
  }

  console.log("\n");
  Logs.success(`${getT("$t(app.generateFileDone)")}\n\t${options.outDir}\n`);
  // 触发插件 onEnd 事件
  context.onEnd?.();
};
