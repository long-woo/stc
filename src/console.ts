import * as Colors from "@std/fmt/colors";

import { getT } from "./i18n/index.ts";

/**
 * 输出提示信息
 * @param str - 文本内容
 */
const info = (str: unknown) => {
  console.info(
    Colors.bgBlue(getT(" $t(console.info) ")) +
      ` ${Colors.blue(formatLogMessage(str))}`,
  );
};

/**
 * 输出成功信息
 * @param str - 文本内容
 */
const success = (str: unknown) => {
  console.info(
    Colors.bgGreen(getT(" $t(console.success) ")) +
      ` ${Colors.green(formatLogMessage(str))}`,
  );
};

/**
 * 输出警告信息
 * @param str - 文本内容
 */
const warn = (str: unknown) => {
  console.log(
    Colors.bgYellow(getT(" $t(console.warn) ")) +
      ` ${Colors.yellow(formatLogMessage(str))}`,
  );
};

const formatLogMessage = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/**
 * 输出错误信息
 * @param str - 文本内容
 */
const error = (str: unknown) => {
  console.error(
    Colors.bgRed(getT(" $t(console.error) ")) +
      ` ${Colors.red(formatLogMessage(str))}`,
  );
};

/**
 * 清空终端信息
 */
const clear = () => console.clear();

export default {
  info,
  success,
  warn,
  error,
  clear,
};
