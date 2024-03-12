import { IPlugin } from "./plugins/typeDeclaration.ts";

export type IDefaultObject<T = unknown> = {
  [key: string]: T;
};

/**
 * 参数类别
 */
export type parameterCategory =
  | "path"
  | "query"
  | "body"
  | "formData"
  | "header";

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
  format?: string;
  items?: ISwaggerSchema;
  /**
   * 默认值
   */
  default?: string | number | boolean;
  /**
   * v3 枚举值
   */
  enum?: Array<string | number>;
  /**
   * Apifox - 属性
   */
  properties?: IDefaultObject<IDefinitionVirtualProperty>;
  /**
   * Apifox - 必填属性
   */
  required?: Array<string>;
}

export interface ISwaggerContentSchema {
  schema?: ISwaggerSchema;
}

export interface ISwaggerContent {
  "application/json"?: ISwaggerContentSchema;
  "application/octet-stream"?: ISwaggerContentSchema;
}

interface ISwaggerMethodResponseStatus {
  description: string;
  /**
   * v2
   */
  schema?: ISwaggerSchema;
  /**
   * v3
   */
  content?: ISwaggerContent;
}

interface ISwaggerMethodResponses {
  200: ISwaggerMethodResponseStatus;
}

interface ISwaggerMethodParameter {
  in: parameterCategory;
  name: string;
  type?: string;
  format?: string;
  required: boolean;
  description: string;
  schema?: ISwaggerSchema;
  items: ISwaggerSchema;
}

interface ISwaggerMethodBody {
  description: string;
  content: ISwaggerContent;
  required?: boolean;
}

export interface ISwaggerResultPath {
  operationId: string;
  consumes: string[];
  produces: string[];
  summary: string;
  description: string;
  tags: string[];
  /**
   * v2 请求参数，path、query、body
   */
  parameters: ISwaggerMethodParameter[];
  /**
   * v3 请求体
   */
  requestBody: ISwaggerMethodBody;
  responses: ISwaggerMethodResponses;
}

interface ISwaggerDefinitionProperties {
  type: string;
  $ref?: string;
  description?: string;
  format?: string;
  items?: ISwaggerSchema;
  enum?: string[];
}

export interface ISwaggerComponents {
  schemas: IDefaultObject<ISwaggerResultDefinition>;
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
  /**
   * v2 版本定义
   */
  definitions: IDefaultObject<ISwaggerResultDefinition>;
  /**
   * v3 版本定义
   */
  components: ISwaggerComponents;
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>;
  produces: string[];
  securityDefinitions: IDefaultObject<ISwaggerResultSecurity>;
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
   * 扩展类型
   */
  typeX?: string;
  /**
   * 属性注释
   */
  description?: string;
  /**
   * 是否必需
   */
  required?: boolean;
  /**
   * v2 默认值
   */
  default?: string;
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
  /**
   * Apifox - 属性标题
   */
  title?: string;
  /**
   * type 为 object 时，定义的属性对象
   */
  properties?: IDefinitionVirtualProperty[];
  /**
   * Apifox - 属性定义
   */
  items?: IDefinitionVirtualProperty;
}

export interface IPathVirtualParameter {
  path: Array<IDefinitionVirtualProperty>;
  query: Array<IDefinitionVirtualProperty>;
  body: Array<IDefinitionVirtualProperty>;
  formData: Array<IDefinitionVirtualProperty>;
  header: Array<IDefinitionVirtualProperty>;
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
  parameters: IPathVirtualParameter;
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
  response: IPathVirtualPropertyResponse;
  /**
   * 注释
   */
  summary: string;
  /**
   * 描述
   */
  description: string;
  /**
   * 标签，用于文件名
   */
  tag: string;
}

export interface IPathVirtualPropertyResponse {
  /**
   * 外部定义
   */
  ref?: string;
  /**
   * 类型
   */
  type?: string;
  /**
   * 内部定义
   */
  properties?: IDefinitionVirtualProperty[];
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

export interface ISwaggerOptions {
  /**
   * 远程地址或本地 json 文件路径
   */
  readonly url: string;
  /**
   * 输出目录
   */
  readonly outDir: string;
  /**
   * 平台。默认：axios
   */
  readonly platform?: "axios" | "wechat";
  /**
   * 语言，用于输出文件的后缀名。默认：ts
   */
  readonly lang?: string;
  /**
   * 插件
   */
  readonly plugins?: IPlugin[];
  /**
   * 过滤接口，符合过滤条件的接口会被生成
   */
  readonly filter?: string[];
  /**
   * 从接口指定标签，默认使用 tags 的第一个用于文件名
   */
  readonly tag?: number;
  /**
   * 动态路径方法的连接词，默认值为 by
   */
  readonly con?: string;
  /**
   * 方法名是否添加请求方法，默认值为 true
   */
  readonly addMethod?: boolean;
}

export interface IDefinitionNameMapping {
  name: string;
  mappings?: Record<string, string>;
}

export interface IApiParseResponseRef {
  name: string;
  import: Array<string>;
}

export interface IApiParseResponse {
  def: string;
  interface?: Array<string>;
  import?: Array<string>;
}
