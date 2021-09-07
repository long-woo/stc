import { ensureFile } from 'https://deno.land/std@0.106.0/fs/mod.ts'

import Logs from '../console.ts'
import { HttpMethod, IDefaultObject, IGenerateRuntimeApiParams, ISwaggerDefinitionPropertieItems, ISwaggerMethodParameter, ISwaggerResult, ISwaggerResultDefinitions, propertyType } from "../swagger.ts"

// 记录定义内容
const mapDefinitions = new Map<string, string>()

/**
 * 获取定义名称
 * @param ref - 定义参数
 */
const getDefinitionName = (ref?: string) => ref ? `I${ref.slice(14)}` : ''

/**
 * 转换为 TypeScript 类型
 * @param type - 属性基础类型
 * @param typeItem - 属性非基础类型
 * @returns 
 */
const convertType = (type: propertyType, typeItem?: ISwaggerDefinitionPropertieItems): string => {
  switch(type) {
    case 'integer':
      return 'number'
    case 'array':
      if (typeItem?.type) {
        const childType = convertType(typeItem.type as propertyType)

        return `${childType}[]`
      }

      if (typeItem?.$ref) {
        const key = getDefinitionName(typeItem.$ref)

        return `${key}[]`
      }

      return '[]'
    case 'object':
      return 'IDefaultObject'
    default:
      return type
  }
}

/**
 * 生成注释
 * @param comment - 注释描述
 * @returns 
 */
const generateComment = (comment?: string) => {
  return comment ? `/**
 * ${comment}
 */` : ''
}

const getDefinitionContent = (name: string, defs: IDefaultObject<ISwaggerResultDefinitions>) => {
  const def = defs[name.slice(1)]

  if (def.type === 'object') {
    const properties = def.properties
    const propertiesKeys = Object.keys(properties)
    
    const res = propertiesKeys.reduce((prev: string[], current: string, index: number) => {
      const prop = properties[current]
      const type = convertType((prop.$ref || prop.type) as propertyType, prop.items)
      const customType = prop.$ref || prop.items?.$ref

      // 处理自定义的类型
      if (customType) {
        const customKey = getDefinitionName(customType)
        const content = generateDefinition(customKey, defs)
        
        prev.unshift(content)
      }

      prev.push(`${generateComment(prop.description)}
\t${current}: ${type}\n${propertiesKeys.length - 1 === index ? '}\n' : ''}`)

      return prev
    }, [`\nexport interface ${name} {`])

    return res.join('')
  }

  return ''
}

/**
 * 生成定义
 * @param key 
 * @param definitions 
 * @returns 
 */
const generateDefinition = (key: string, definitions: IDefaultObject<ISwaggerResultDefinitions>) => {
  if (mapDefinitions.has(key) || !key) return ''

  const content = getDefinitionContent(key, definitions)

  mapDefinitions.set(key, content)
  return content
}

/**
 * 获取请求体参数定义
 * @param parameters - Api 参数信息
 */
const getParameterBodyDefinition = (parameters: ISwaggerMethodParameter[] = [], definitions: IDefaultObject<ISwaggerResultDefinitions>) => {
  const content = parameters.reduce((prev, current) => {
    if (current.in !== 'body') return ''

    const ref = current.schema.$ref
    const key = getDefinitionName(ref)
    
    prev += generateDefinition(key, definitions)
    return prev
  }, '')

  return content
}

/**
 * 生成运行时 Api
 * @param params - 参数
 */
const generateRuntimeApi = (params: IGenerateRuntimeApiParams) => {
  const functionTemplate = `
export const ${params.name} = () => webClient.${params.method}<${params.responseKey || 'void'}>('${params.url}')
`

  return functionTemplate
}

/**
 * 获取 Swagger 数据
 * @param urlOrPath - 远程地址或本地
 * @returns 
 */
const getSwaggerData = async (urlOrPath: string) => {
  // 从远程地址获取 Swagger 数据
  const res = await fetch(urlOrPath)
  const data: ISwaggerResult = await res.json()

  return data
}

/**
 * 生成默认定义
 * @param outDir - 输出路径
 * @returns 
 */
const generateDefaultDefinition = async (outDir: string) => {
  const outPath = `${outDir}/shared/index.ts`

  const content = `export interface IDefaultObject<T = string> {
  [key: string]: T
}

export interface IRequestParams<T, U>{
	path?: string
	query?: T
	body?: U
}`

  await ensureFile(outPath)
  await Deno.writeFile(outPath, new TextEncoder().encode(content))
}

/**
 * 生成 Api
 * @param urlOrPath 远程地址或本地
 * @param outDir 输出路径
 */
export const generateApi = async (urlOrPath: string, outDir: string) => {
  const data = await getSwaggerData(urlOrPath)

  const paths = data.paths
  const definitions = data.definitions

  // 清空控制台信息
  Logs.clear()

  // 生成默认定义
  generateDefaultDefinition(outDir)

  // 遍历所有 API 路径
  for (const key of Object.keys(paths)) {
    if (key !== '/api/followUp/saveFollowUpSetting') continue
    mapDefinitions.clear()
    Logs.info(`${key} 接口生成中...`)

    const pathKeys = key.split('/')

    // 文件名。取之 API 路径第二个
    const fileName = `${pathKeys[2]}.ts`
    const outPath = `${outDir}/${fileName}`

    // 文件内容
    let content = `// 由 swagger2code 生成
import { webClient } from './runtime/fetch'
import { IDefaultObject, IRequestParams } from './shared/index'
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

      content += getParameterBodyDefinition(methodOption.parameters, definitions)

      const responseRef = methodOption.responses[200].schema?.$ref
      const responseKey = getDefinitionName(responseRef)
      content += generateDefinition(responseKey, definitions)
      
      content += generateRuntimeApi({
        name: methodName,
        url: key,
        method: methodKey as HttpMethod,
        requestKey: '',
        responseKey
      })
    }

    // 写入文件
    const fileData = new TextEncoder().encode(content)
    await ensureFile(outPath)
    await Deno.writeFile(outPath, fileData)

    Logs.success('完成。\n')
  }
}
