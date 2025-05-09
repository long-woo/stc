import type { DefaultConfigOptions, ISwaggerResult } from "./swagger.ts";
import type { IPluginContext } from "./plugins/typeDeclaration.ts";
import Logs from "./console.ts";
import { PluginManager } from "./plugins/index.ts";
import { getApiPath, getDefinition } from "./core.ts";
import { createDiffFile, createFile, readFile, removeFile } from "./utils.ts";
import { getT } from "./i18n/index.ts";

const LOCK_FILE = ".stc.lock";

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
const getData = async (
  urlOrPath: string,
  outDir: string,
): Promise<ISwaggerResult> => {
  try {
    // const lockFile = await readFile(`${outDir}/${LOCK_FILE}`);
    let data: ISwaggerResult;

    // 从本地文件获取 Swagger 数据
    if (!/^http(s?):\/\//.test(urlOrPath)) {
      const content = await readFile(urlOrPath);

      data = JSON.parse(content) as unknown as ISwaggerResult;
    } else {
      // 从远程地址获取 Swagger 数据
      const res = await fetch(urlOrPath);

      data = await res.json();
    }

    // 对比 path 和 definitions/schemas 数据是否有变化，有变化则使用新数据
    // if (lockFile) {
    //   const oldData = JSON.parse(lockFile) as unknown as ISwaggerResult;
    //   createFile(
    //     `${outDir}/.stc_new.lock`,
    //     JSON.stringify(data, null, 2),
    //     {
    //       banner: false,
    //     },
    //   );
    //   const isChange = diff["diffLines"](
    //     JSON.stringify(oldData, null, 2),
    //     JSON.stringify(data, null, 2),
    //   );

    //   createFile(
    //     `${outDir}/.stc_diff.lock`,
    //     JSON.stringify(isChange, null, 2),
    //     {
    //       banner: false,
    //     },
    //   );
    // }

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

  const data = await getData(options.url, options.outDir);

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
    const exclude = [`${options.outDir}/${LOCK_FILE}`];

    if (!options.shared) {
      exclude.push(`${options.outDir}/shared/**/*`);
    }

    await removeFile(`${options.outDir}/**/*.*`, {
      exclude,
    });
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
    const content = transformData.definition.content;

    createDiffFile(name, content, options.clean);
  }

  // 写入 API 文件
  if (transformData?.action) {
    transformData.action.forEach((content, filename) => {
      createDiffFile(`${options.outDir}/${filename}`, content, options.clean);
    });
  }

  // 保存数据
  createFile(`${options.outDir}/${LOCK_FILE}`, JSON.stringify(data, null, 2), {
    banner: false,
  });

  console.log("\n");
  Logs.success(`${getT("$t(app.generateFileDone)")}\n\t${options.outDir}\n`);
  // 触发插件 onEnd 事件
  context.onEnd?.(context.options);
};
