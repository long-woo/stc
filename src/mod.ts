import { parse } from 'https://deno.land/std@0.106.0/flags/mod.ts'
import { ensureFile } from 'https://deno.land/std@0.106.0/fs/mod.ts'

import Logs from './color.ts'
import { HttpMethod, IParseApiMethodParams, ISwaggerDefinitionOptions, ISwaggerResult } from "./swagger.ts";

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

const generateResponseInterface = (res: ISwaggerDefinitionOptions) => {
  if (res.type === 'object') {
    
  }
}

/**
 * 解析 Api 的方法
 * @param params - 参数
 */
const parseApiMethod = (params: IParseApiMethodParams) => {
  const options = params.options

  // 参数对象
  
  // const request = ''

  // 响应对象
  const responseRef = options.responses[200].schema.$ref
  const responseKey = responseRef.slice(14)
  const response = params.definitions[responseKey]
  console.log(JSON.stringify(response))

  const functionTemplate = `
export const ${params.name} = () => webClient.${params.method}<${responseKey}>('${params.url}')
`

  return functionTemplate
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

  const pathKeys = key.split('/')

  // 文件名。取之 API 路径第二个
  const fileName = `${pathKeys[2]}.ts`
  const outPath = `${outDir}/${fileName}`

  // 文件内容
  let content = `// 由 swagger2code 生成

import { webClient } from './web_api'
`

  // 当前 API 的所有方法
  const methods = paths[key]
  const methodKeys = Object.keys(methods)

  // 遍历当前 API 方法
  for (const methodKey of methodKeys) {
    const methodOption = methods[methodKey]
    let methodName = pathKeys[3]

    // 若同一个地址下存在多个请求方法
    if (methodKeys.length > 1) {
      methodName = methodKey + methodName.charAt(0).toUpperCase() + methodName.slice(1)
    }
    
    content += parseApiMethod({
      name: methodName,
      url: key,
      method: methodKey as HttpMethod,
      options: methodOption,
      definitions
    })
  }

  // 写入文件
  const fileData = new TextEncoder().encode(content)
  await ensureFile(outPath)
  await Deno.writeFile(outPath, fileData)

  Logs.success('完成\n')
  Deno.exit()
}
