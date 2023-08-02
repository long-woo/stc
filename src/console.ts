import * as Colors from "std/fmt/colors.ts";

import { getT } from "./i18n/index.ts";

/**
 * 输出提示信息
 * @param str - 文本内容
 */
const info = (str: string) => {
  console.info(
    Colors.bgBlue(getT(" $t(console.info) ")) +
      ` ${Colors.blue(str)}`,
  );
};

/**
 * 输出成功信息
 * @param str - 文本内容
 */
const success = (str: string) => {
  console.info(
    Colors.bgGreen(getT(" $t(console.success) ")) + ` ${Colors.green(str)}`,
  );
};

/**
 * 输出警告信息
 * @param str - 文本内容
 */
const warn = (str: string) => {
  console.log(
    Colors.bgYellow(getT(" $t(console.warn) ")) + ` ${Colors.yellow(str)}`,
  );
};

/**
 * 输出错误信息
 * @param str - 文本内容
 */
const error = (str: string) => {
  console.error(
    Colors.bgRed(getT(" $t(console.error) ")) + ` ${Colors.red(str)}`,
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
