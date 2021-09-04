import * as Colors from 'https://deno.land/std@0.106.0/fmt/colors.ts'

/**
 * 输出提示信息
 * @param str - 文本内容
 */
 const info = (str: string) => {
  console.info(
    Colors.bgBlue(' 信息 ') + ` ${Colors.blue(str)}`
  )
}

/**
 * 输出成功信息
 * @param str - 文本内容
 */
const success = (str: string) => {
  console.info(
    Colors.bgGreen(' 信息 ') + ` ${Colors.green(str)}`
  )
}

/**
 * 输出错误信息
 * @param str - 文本内容
 */
const error = (str: string) => {
  console.error(
    Colors.bgRed(' 错误 ') + ` ${Colors.red(str)}`
  )
}

export default {
  info,
  success,
  error
}