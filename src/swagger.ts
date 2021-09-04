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
  schema?: ISwaggerMethodSchema
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

interface ISwaggerPathMethodOption {
  operationId: string
  consumes: string[]
  produces: string[]
  summary: string
  tags: string[]
  parameters?: ISwaggerMethodParameter[]
  responses: ISwaggerMethodResponses
}

export interface ISwaggerPathMethod {
  [key: string]: ISwaggerPathMethodOption
}

interface ISwaggerResultPaths {
  [key: string]: ISwaggerPathMethod
}

interface ISwaggerDefinitionProperties {
  type: string
  format?: string
}

interface ISwaggerDefinitionOptions {
  type: string
  properties: ISwaggerDefinitionProperties
}

interface ISwaggerResultDefinitions {
  [key: string]: ISwaggerDefinitionOptions
}

export interface ISwaggerResult {
  basePath: string
  host: string
  swagger: string
  consumes: string[]
  info: ISwaggerResultInfo
  tags: ISwaggerResultTag[]
  definitions: ISwaggerResultDefinitions
  paths: ISwaggerResultPaths
  produces: string[]
}
