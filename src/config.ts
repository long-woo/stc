import { exists } from "@std/fs";
import { pathToFileURL } from "node:url";

import { readFile } from "./utils.ts";
import type { DefaultConfigOptions, IDefaultObject } from "./swagger.ts";

/**
 * 支持的配置文件名，按查找优先级排序
 */
export const CONFIG_FILE_NAMES = [
  "stc.config.json",
  "stc.config.ts",
  "stc.config.js",
  ".stcrc.json",
  ".stcrc",
];

/**
 * 配置文件中支持的选项（与 CLI 选项同名，`plugins` 除外）
 */
export type IConfigFileOptions =
  & Partial<Omit<DefaultConfigOptions, "plugins">>
  & IDefaultObject;

/**
 * 查找配置文件
 *
 * @param explicitPath - 通过 `--config` 显式指定的路径
 * @returns 配置文件路径，未找到时返回 undefined
 */
export const findConfigFile = async (
  explicitPath?: string,
): Promise<string | undefined> => {
  if (explicitPath) {
    return (await exists(explicitPath)) ? explicitPath : undefined;
  }

  for (const name of CONFIG_FILE_NAMES) {
    if (await exists(name)) return name;
  }

  return undefined;
};

/**
 * 读取并解析配置文件内容
 *
 * @param path - 配置文件路径
 * @returns 配置对象
 */
export const parseConfigContent = (
  content: string,
  path: string,
): IDefaultObject => {
  if (!content.trim()) return {};

  try {
    const data: unknown = JSON.parse(content);

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("invalid config content");
    }

    return data as IConfigFileOptions;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`${path}: ${message}`);
  }
};

/**
 * 加载配置文件
 *
 * @param explicitPath - 通过 `--config` 显式指定的路径
 * @returns 配置对象，未找到配置文件时返回空对象
 */
export const loadConfigFile = async (
  explicitPath?: string,
): Promise<{ options: IDefaultObject; path?: string }> => {
  const path = await findConfigFile(explicitPath);

  if (!path) {
    // 未找到配置文件。显式指定但不存在的情况，由调用方判断处理
    return { options: {}, path: undefined };
  }

  // ts/js 配置文件通过动态导入加载，支持 `export default`
  if (path.endsWith(".ts") || path.endsWith(".js")) {
    // 配置文件可能在 watch 模式下被重复加载，使用查询参数绕过模块缓存。
    const modulePath = await Deno.realPath(path);
    const module = await import(
      `${pathToFileURL(modulePath).href}?stc_config_reload=${Date.now()}`
    );
    const config: unknown = module.default ?? module;

    if (typeof config !== "object" || config === null) {
      throw new Error(`${path}: invalid config content`);
    }

    return { options: config as IDefaultObject, path };
  }

  const content = await readFile(path);

  return { options: parseConfigContent(content, path), path };
};

/**
 * 规范化配置：`filter`、`globalHeader` 支持字符串或字符串数组
 *
 * @param options - 配置对象
 */
export const normalizeConfig = (
  options: IDefaultObject,
): IDefaultObject => {
  const result: IDefaultObject = { ...options };

  (["filter", "globalHeader"] as const).forEach((key) => {
    const value = result[key];

    if (typeof value === "string") {
      result[key] = [value];
    }
  });

  if (typeof result.interval === "string") {
    const value = Number(result.interval);

    if (!Number.isNaN(value)) {
      result.interval = value;
    }
  }

  return result;
};
