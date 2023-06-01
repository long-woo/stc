import * as Colors from "std/fmt/colors.ts";

/**
 * 输出提示信息
 * @param str - 文本内容
 */
const info = (str: string) => {
  console.info(
    Colors.bgBlue(" 信息 ") + ` ${Colors.blue(str)}`,
  );
};

/**
 * 输出成功信息
 * @param str - 文本内容
 */
const success = (str: string) => {
  console.info(
    Colors.bgGreen(" 成功 ") + ` ${Colors.green(str)}`,
  );
};

/**
 * 输出警告信息
 * @param str - 文本内容
 */
const warn = (str: string) => {
  console.log(
    Colors.bgYellow(" 警告 ") + ` ${Colors.yellow(str)}`,
  );
};

/**
 * 输出错误信息
 * @param str - 文本内容
 */
const error = (str: string) => {
  console.error(
    Colors.bgRed(" 错误 ") + ` ${Colors.red(str)}`,
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
