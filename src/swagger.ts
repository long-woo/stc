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
 * 属性类型
 */
export type propertyType =
  | "string"
  | "integer"
  | "boolean"
  | "array"
  | "object";

/**
 * 参数类型
 */
export type paramType = "path" | "query" | "body" | "formData";

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
  $ref: string;
}

interface ISwaggerMethodResponseStatus {
  description: string;
  schema?: ISwaggerSchema;
}

interface ISwaggerMethodResponses {
  200: ISwaggerMethodResponseStatus;
}

export interface ISwaggerMethodParameter {
  in: paramType;
  name: string;
  type: string;
  format: string;
  required: boolean;
  description: string;
  schema: ISwaggerSchema;
}

export interface ISwaggerResultPaths {
  operationId: string;
  consumes: string[];
  produces: string[];
  summary: string;
  tags: string[];
  parameters: ISwaggerMethodParameter[];
  responses: ISwaggerMethodResponses;
}

export interface ISwaggerDefinitionPropertiesItems
  extends Partial<ISwaggerSchema> {
  type?: string;
}

export interface ISwaggerDefinitionProperties {
  type?: string;
  $ref?: string;
  description?: string;
  format?: string;
  items?: ISwaggerDefinitionPropertiesItems;
  enum?: string[];
}

export interface ISwaggerResultDefinitions {
  type: string;
  required?: string[];
  properties: IDefaultObject<ISwaggerDefinitionProperties>;
}

export interface ISwaggerResult {
  basePath: string;
  host: string;
  swagger: string;
  consumes: string[];
  info: ISwaggerResultInfo;
  tags: ISwaggerResultTag[];
  definitions: IDefaultObject<ISwaggerResultDefinitions>;
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPaths>>;
  produces: string[];
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

export interface IGenerateRuntimeApiOptions {
  /**
   * 方法名
   */
  name: string;

  /**
   * 请求地址
   */
  url: string;

  /**
   * 请求方式
   */
  method: HttpMethod;

  /**
   * 请求参数
   */
  params?: IRequestParams<string, string>;

  /**
   * 响应对象 Key
   */
  responseKey: string;

  comment?: string;
}

export interface IGenerateApiContentParams {
  url: string;
  method: HttpMethod;
  methodName: string;
  methodOption: ISwaggerResultPaths;
  definitions: IDefaultObject<ISwaggerResultDefinitions>;
}

export interface IGetApiContentParams {
  /**
   * 文件名
   */
  fileName: string;

  /**
   * url
   */
  url: string;

  /**
   * url 请求方式
   */
  methods: IDefaultObject<ISwaggerResultPaths>;

  /**
   * 定义的对象
   */
  definitions: IDefaultObject<ISwaggerResultDefinitions>;
}

/**
 * 参数定义
 */
export interface IParamDefinition<T = string[]> {
  key: string;
  required?: boolean;
  value: T;
}

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
  comment?: string;
  /**
   * 是否必需
   */
  isRequired?: boolean;
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
