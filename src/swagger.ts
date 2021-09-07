export interface IDefaultObject<T = string> {
  [key: string]: T
}

interface ISwaggerResultInfo {
  title: string
  description: string
  version: string
  license: unknown
}

interface ISwaggerResultTag {
  name: string
  description: string
}

interface ISwaggerMethodSchema {
  $ref: string
}

interface ISwaggerMethodResponseStatus {
  description: string
  schema: ISwaggerMethodSchema
}

interface ISwaggerMethodResponses {
  200: ISwaggerMethodResponseStatus
}

interface ISwaggerMethodParameter {
  in: string
  name: string
  type?: string
  format?: string
  required: boolean
  description?: string
  schema?: ISwaggerMethodSchema
}

export interface ISwaggerResultPaths {
  operationId: string
  consumes: string[]
  produces: string[]
  summary: string
  tags: string[]
  parameters?: ISwaggerMethodParameter[]
  responses: ISwaggerMethodResponses
}

interface ISwaggerDefinitionProperties {
  type: string
  description: string
  format: string
}

export interface ISwaggerResultDefinitions {
  type: string
  properties: IDefaultObject<ISwaggerDefinitionProperties>
}

export interface ISwaggerResult {
  basePath: string
  host: string
  swagger: string
  consumes: string[]
  info: ISwaggerResultInfo
  tags: ISwaggerResultTag[]
  definitions: IDefaultObject<ISwaggerResultDefinitions>
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPaths>>
  produces: string[]
}

// Http 方法
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'head' | 'options' | 'patch'

export interface IGenerateRuntimeApiParams {
  /**
   * 方法名
   */
  name: string

  /**
   * 请求地址
   */
  url: string

  /**
   * 请求方法
   */
  method: HttpMethod

  /**
   * 请求对象 Key
   */
  requestKey: string

  /**
   * 响应对象 Key
   */
  responseKey: string
}
