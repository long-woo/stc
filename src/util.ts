import { copy, emptyDir, ensureFile } from "std/fs/mod.ts";
import { format as dateFormat } from "std/datetime/format.ts";

interface ICopyFileOptions {
  /**
   * 覆盖现有文件或目录。默认为 true
   */
  overwrite?: boolean;
  // ignore?: Array<string> | string | RegExp;
  // include?: Array<string> | string;
}

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
    new TextEncoder().encode(`// 由 swagger2code 生成
// ${dateFormat(new Date(), "yyyy-MM-dd HH:mm:ss")}

${content}`),
  );
};

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
  ref.replace(/^#\/(definitions|components\/schemas)\//, "");

/**
 * 转换为 typescript 类型
 * @param type - 类型
 * @param ref - 引用
 * @returns
 */
export const convertType = (type: string, ref?: string) => {
  // 当只有 ref 的时候，直接返回 ref
  if (!type && ref) return ref;

  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type || "unknown";

  const _action: Record<string, string> = {
    string: "string",
    integer: "number",
    boolean: "boolean",
    array: `Array<${ref && convertType(ref) || "unknown"}>`,
    object: "Record<string, unknown>",
    file: "File",
  };

  return _action[type] || type;
};

/**
 * 属性注释
 * @param commit - 注释
 */
export const propCommit = (commit: string) =>
  commit
    ? `\t/*
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
 * 获取目录所有文件
 * @param dir - 目录
 */
export const getDirFiles = async (dir: string) => {
  const files: string[] = [];

  for await (const file of Deno.readDir(dir)) {
    if (file.isFile) {
      files.push(`${dir}/${file.name}`);
    }

    if (file.isDirectory) {
      const childFiles = await getDirFiles(`${dir}/${file.name}`);

      files.push(...childFiles);
    }
  }

  return files;
};
