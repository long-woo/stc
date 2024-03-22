import { copy, emptyDir, ensureFile } from "std/fs/mod.ts";
import { format as dateFormat } from "std/datetime/format.ts";

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
export const camelCase = (str: string, pascalCase: boolean = false) => {
  if (!str) return "";
  const _newStr = pascalCase ? `_${str}` : str;

  return _newStr.replace(/[\.\_-](\w)/g, (_, s: string) => s.toUpperCase());
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
export const readFile = (filePath: string) => Deno.readTextFile(filePath);

/**
 * 创建文件。如果不存在会被自动创建，存在会被覆盖
 *
 * @param filePath - 文件路径
 * @param content - 文件内容
 */
export const createFile = async (filePath: string, content: string) => {
  await ensureFile(filePath);
  await Deno.writeFile(
    filePath,
    new TextEncoder().encode(
      `/* ${
        getT("$t(util.createFileDescription)", { version: denoJson.version })
      }
 *
 * https://github.com/long-woo/stc
 * ${dateFormat(new Date(), "yyyy-MM-dd HH:mm:ss")}
 */

${content}`,
    ),
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
 * 转换为 typescript 类型
 * @param type - 类型
 * @param ref - 引用
 * @returns
 */
export const convertType = (type: string | string[], ref?: string) => {
  // 当只有 ref 或者 type 为 object 时，直接返回 ref
  if ((!type || type === "object") && ref) return ref;

  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type || "unknown";

  const _action: Record<string, string> = {
    string: "string",
    integer: "number",
    boolean: "boolean",
    array: `Array<${ref && convertType(ref) || "unknown"}>`,
    object: "Record<string, unknown>",
    file: "File",
    null: "null",
    bool: "boolean",
  };

  const _newType = Array.isArray(type) ? type : [type];

  const _type = _newType
    .map((item) => _action[item] ?? type)
    .filter((item) => item)
    .join(" | ");

  return _type;
};

/**
 * 属性注释
 * @param commit - 注释
 */
export const propCommit = (commit: string) =>
  commit
    ? `\t/**
\t * ${commit}
\t */\n\t`
    : "\t";

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
