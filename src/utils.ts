import * as diff from "diff";
import type { ExpandGlobOptions } from "@std/fs";
import { copy, emptyDir, ensureFile, exists, expandGlob } from "@std/fs";
import { format as dateFormat } from "@std/datetime";

import denoJson from "../deno.json" with { type: "json" };
import { getT } from "./i18n/index.ts";

interface ICopyFileOptions {
  /**
   * 覆盖现有文件或目录。默认为 true
   */
  overwrite?: boolean;
  // ignore?: Array<string> | string | RegExp;
  // include?: Array<string> | string;
}

/**
 * 驼峰命名
 * @param str - 字符
 * @param pascalCase - 是否首字母大写
 */
export const camelCase = (str: string, pascalCase = false) => {
  if (!str) return "";
  const _newStr = pascalCase ? `_${str}` : str;

  return _newStr.replace(/[\.\_-]{1,}(\w)/g, (_, s: string) => s.toUpperCase());
};

/**
 * 首字母小写
 * @param str - 字符
 */
export const lowerCase = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1);

/**
 * 首字母大写
 * @param str - 字符
 */
export const upperCase = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * 读取文件
 * @param filePath - 文件路径
 */
export const readFile = async (filePath: string) => {
  // 检查路径是否存在
  if (!(await exists(filePath))) return "";
  return Deno.readTextFile(filePath);
};

/**
 * 创建文件。如果不存在会被自动创建，存在会被覆盖
 *
 * @param filePath - 文件路径
 * @param content - 文件内容
 */
export const createFile = async (
  filePath: string,
  content: string,
  { append, banner = true }: { append?: boolean; banner?: boolean } = {},
) => {
  await ensureFile(filePath);
  await Deno.writeFile(
    filePath,
    new TextEncoder().encode(
      `${
        banner
          ? `/** ${
            getT("$t(util.createFileDescription)", {
              version: denoJson.version,
            })
          }
 *
 * https://github.com/long-woo/stc
 * ${dateFormat(new Date(), "yyyy-MM-dd HH:mm:ss")}
 */\n\n`
          : ""
      }${content}`,
    ),
    { append },
  );
};

/**
 * 将给定的内容写入指定路径的文件中
 *
 * @param {string} filePath - 要创建或覆盖的文件的路径
 * @param {ArrayBuffer} content - 要写入文件的内容
 * @return {Promise<void>} - 在文件成功写入时解析，或在出现错误时拒绝
 */
export const createAppFile = (
  filePath: string,
  content: ArrayBuffer,
) => Deno.writeFile(filePath, new Uint8Array(content));

/**
 * 覆盖复制文件
 * @param from - 复制位置
 * @param to - 目标位置
 */
export const copyFile = (
  from: string,
  to: string,
  options: ICopyFileOptions = { overwrite: true },
) => {
  copy(from, to, { overwrite: options.overwrite });
};

/**
 * 清空目录
 * @param dir - 目录
 */
export const emptyDirectory = (dir: string) => emptyDir(dir);

/**
 * ref type
 * @param ref - ref
 */
export const getRefType = (ref: string) =>
  camelCase(
    decodeURIComponent(ref).replace(
      /^#\/(definitions|components\/schemas)\//,
      "",
    ),
    true,
  );

/**
 * 根据值获取对象的 key
 * @param obj - 对象
 * @param value - 值
 */
export const getObjectKeyByValue = (
  obj: Record<string, string>,
  value: string,
) => Object.keys(obj).find((key) => obj[key] === value);

/**
 * 检查给定的对象是否具有指定的键。
 *
 * @param {Record<string, string>} obj - 要检查键的对象
 * @param {string} name - 要检查的键的名称
 * @return {boolean} 如果对象具有指定的键，则返回true，否则返回false
 */
export const hasKey = (obj: Record<string, unknown>, name: string) =>
  Object.prototype.hasOwnProperty.call(obj, name);

/**
 * Converts a string value to its corresponding JavaScript data type.
 *
 * @param {string} value - The value to be converted.
 * @return {any} The converted JavaScript data type.
 */
export const convertValue = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
};

/**
 * Fetches a client from the specified URL with optional request options.
 *
 * @param {string} url - The URL to fetch the client from.
 * @param {RequestInit & { timeout?: number }} options - Optional request options.
 * @return {Promise<Response>} A promise that resolves to the response from the server.
 */
export const fetchClient = async (
  url: string,
  options: RequestInit & { timeout?: number } = { timeout: 5000 },
) => {
  const responsePromise = fetch(url, options);

  // 创建一个超时 Promise
  const timeoutPromise = new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error(getT("$t(util.timeout)")));
    }, options?.timeout);
  });

  // 等待任意一个 Promise 完成
  const res = await Promise.race([responsePromise, timeoutPromise]);

  if (res instanceof Response) {
    // 请求成功，返回响应
    return res;
  }

  throw res;
};

/**
 * 移除文件
 * @param glob - 匹配文件
 * @param options - 选项
 */
export const removeFile = async (
  glob: string | URL,
  options?: ExpandGlobOptions,
) => {
  const _files = await Array.fromAsync(
    expandGlob(glob, options),
  );

  for await (const _file of _files) {
    await Deno.remove(_file.path);
  }
};

/**
 * 清除文件 banner
 * @param path - 文件路径
 */
export const removeFileBanner = async (path: string) => {
  const file = await readFile(path);
  const content = file.replace(
    /\/\*\*.+`?https:\/\/github\.com\/long-woo\/stc`?\s+\*\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+\*\/\s+/s,
    "",
  );

  return content;
};

/**
 * 生成差异文件
 * @param source - 源文件
 * @param content - 内容
 * @param clean - 是否清除差异
 */
export const createDiffFile = async (
  source: string,
  content: string,
  clean: boolean = true,
) => {
  let isChange = true;
  let newContent = content;

  if (!clean) {
    const oldContent = await removeFileBanner(source);

    if (oldContent) {
      const diffResult = diff.diffLines(oldContent, newContent);

      isChange = diffResult.some((item: Record<string, boolean>) =>
        item.added || item.removed
      );

      if (isChange) {
        newContent = "";

        for (const item of diffResult) {
          if (item.removed) continue;

          newContent += item.value;
        }
      }
    }
  }

  if (isChange) createFile(source, newContent);
};
