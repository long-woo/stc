import { parse } from 'https://deno.land/std@0.106.0/flags/mod.ts'

import Logs from './color.ts'
import { ISwaggerPathMethod, ISwaggerResult } from "./swagger.ts";

const args = parse(Deno.args)

// 文件输出目录，默认为 Deno 当前执行的目录
let outDir = Deno.cwd()

// console.log(import.meta)

// if (import.meta.main) {
//   console.log(1)
// }

// 检查 lang 选项
if (typeof args.lang !== 'string' || !args.lang) {
  Logs.error('必须提供 --lang 选项。')
  Deno.exit()
}

// 若没有提供 out 选项，则使用 Deno 当前执行的目录
if (typeof args.out === 'string' && args.out) {
  outDir = args.out
}

// 解析 API 的方法
const parseAPIMethod = (method: ISwaggerPathMethod) => {

}

// 获取远程 Swagger API 地址
const res = await fetch('https://demodata.liangyihui.net/smart/v2/api-docs')
const data: ISwaggerResult = await res.json()

const paths = data.paths
const definitions = data.definitions

// 遍历所有 API 路径
for (const key of Object.keys(paths)) {
  console.clear()
  Logs.info(`${key} 接口生成中...`)

  // 文件名。取之 API 路径第二个
  const fileName = `${key.split('/')[2]}.ts`
  const outPath = outDir + fileName

  // 文件内容
  const content = ''

  // 当前 API 的所有方法
  const methods = paths[key]

  // 遍历当前 API 方法
  for (const methodKey of Object.keys(methods)) {
    const method = methods[methodKey]
    
  }

  // 写入文件
  const fileData = new TextEncoder().encode(content) 
  await Deno.writeFile(outPath, fileData)

  Logs.success('完成\n')
}
