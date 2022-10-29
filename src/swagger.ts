export interface IDefaultObject<T = string> {
  [key: string]: T;
}

export interface IRequestParams<
  Q = IDefaultObject,
  B = IDefaultObject,
  P = string,
  F = string,
  H = IDefaultObject,
> {
  path?: P;
  query?: Q;
  body?: B;
  formData?: F;
  header?: H;
}

/**
 * 原始基础类型
 */
export type originalBaseType =
  | "string"
  | "integer"
  | "boolean"
  | "array"
  | "object";

/**
 * 参数类别
 */
export type parameterCategory = "path" | "query" | "body" | "formData";

interface ISwaggerResultInfo {
  title: string;
  description: string;
  version: string;
  license: unknown;
}

interface ISwaggerResultTag {
  name: string;
  description: string;
}

export interface ISwaggerSchema {
  $ref?: string;
  type?: string;
}

interface ISwaggerMethodResponseStatus {
  description: string;
  schema?: ISwaggerSchema;
}

interface ISwaggerMethodResponses {
  200: ISwaggerMethodResponseStatus;
}

interface ISwaggerMethodParameter {
  in: parameterCategory;
  name: string;
  type: string;
  format: string;
  required: boolean;
  description: string;
  schema: ISwaggerSchema;
}

export interface ISwaggerResultPath {
  operationId: string;
  consumes: string[];
  produces: string[];
  summary: string;
  description: string;
  tags: string[];
  parameters: ISwaggerMethodParameter[];
  responses: ISwaggerMethodResponses;
}

interface ISwaggerDefinitionPropertiesItems extends Partial<ISwaggerSchema> {
  type?: string;
}

interface ISwaggerDefinitionProperties {
  type?: string;
  $ref?: string;
  description?: string;
  format?: string;
  items?: ISwaggerDefinitionPropertiesItems;
  enum?: string[];
}

export interface ISwaggerResultDefinition {
  type: string;
  required?: string[];
  properties: IDefaultObject<ISwaggerDefinitionProperties>;
}

export interface ISwaggerResultSecurity {
  in?: string;
  name?: string;
  type: string;
  authorizationUrl?: string;
  flow?: string;
  scopes?: IDefaultObject;
}

export interface ISwaggerResult {
  basePath: string;
  host: string;
  swagger: string;
  consumes: string[];
  info: ISwaggerResultInfo;
  tags: ISwaggerResultTag[];
  definitions: IDefaultObject<ISwaggerResultDefinition>;
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>;
  produces: string[];
  securityDefinitions: IDefaultObject<ISwaggerResultSecurity>;
}

// Http 方法
export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "head"
  | "options"
  | "patch";

/**
 * 定义的虚拟属性
 */
export interface IDefinitionVirtualProperty {
  /**
   * 属性名
   */
  name: string;
  /**
   * 属性类型
   */
  type: string;
  /**
   * 属性注释
   */
  description?: string;
  /**
   * 是否必需
   */
  required?: boolean;
  /**
   * 枚举选项
   */
  enumOption?: string[];
  /**
   * 自定义类型
   */
  ref?: string;
  /**
   * 格式
   */
  format?: string;
}

/**
 * 接口地址参数
 */
export interface IPathParameter {
  /**
   * 参数类别
   */
  category: parameterCategory;
  /**
   * 参数名
   */
  name: string;
  /**
   * 类型
   */
  type: string;
  /**
   * 描述
   */
  description: string;
  /**
   * 是否必需
   */
  required: boolean;
  /**
   * 格式
   */
  format?: string;
  /**
   * 自定义类型
   */
  ref?: string;
}

/**
 * 接口地址的虚拟属性
 */
export interface IPathVirtualProperty {
  /**
   * 请求地址
   */
  url: string;
  /**
   * 请求方式
   */
  method: string;
  /**
   * 请求参数
   */
  parameters: IPathParameter[];
  /**
   * 请求头
   */
  requestHeaders: string[];
  /**
   * 响应头
   */
  responseHeaders: string[];
  /**
   * 响应体
   */
  response: {
    ref?: string;
    type?: string;
  };
  /**
   * 注释
   */
  summary: string;
  /**
   * 描述
   */
  description: string;
}

export interface ISecurityVirtualProperty {
  /**
   * 类型
   */
  type: string;
  /**
   * header key 名
   */
  name?: string;
  /**
   * 授权地址
   */
  authorizationUrl: string;
  /**
   * 授权范围
   */
  scopes: IDefaultObject;
}
