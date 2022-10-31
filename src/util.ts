import { copy, ensureFile } from "https://deno.land/std@0.106.0/fs/mod.ts";

/**
 * 首字母大写
 * @param str - 字符
 * @returns
 */
export const caseTitle = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

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
    new TextEncoder().encode(`// 由 swagger2code 生成\n${content}`),
  );
};

/**
 * 覆盖复制文件
 * @param from - 复制位置
 * @param to - 目标位置
 */
export const copyFile = (from: string, to: string) => {
  copy(from, to, { overwrite: true });
};

/**
 * ref type
 * @param ref - ref
 */
export const getRefType = (ref: string) => ref.replace("#/definitions/", "");

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
    array: `Array<${ref || "unknown"}>`,
  };

  return _action[type] || "unknown";
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
