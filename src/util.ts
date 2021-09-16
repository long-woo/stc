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
