import type {
  DefaultConfigOptions,
  IDefinitionVirtualProperty,
  IPathVirtualProperty,
  ISwaggerResult,
} from "../swagger.ts";

interface IPluginEvent {
  /**
   * 加载完成事件
   * @param data - 原始数据
   */
  onLoad?: (data: ISwaggerResult, options: IPluginOptions) => void;
  /**
   * 类型定义事件
   * @param data - 类型定义
   */
  onDefinition?: (
    data: Map<
      string,
      IDefinitionVirtualProperty | IDefinitionVirtualProperty[]
    >,
    options: IPluginOptions,
  ) => void;
  /**
   * 接口数据事件
   * @param data - 接口数据
   */
  onAction?: (
    data: Map<string, IPathVirtualProperty>,
    options: IPluginOptions,
  ) => void;
  /**
   * 转换事件
   * @param def - 类型定义
   * @param action - 接口数据
   */
  onTransform: (
    def: Map<string, IDefinitionVirtualProperty | IDefinitionVirtualProperty[]>,
    action: Map<string, IPathVirtualProperty>,
    options: IPluginOptions,
  ) => Promise<IPluginTransform> | IPluginTransform;
  /**
   * 结束事件
   */
  onEnd?: (options: IPluginOptions) => Promise<void> | void;
}

export interface IPluginContext extends Partial<IPluginEvent> {
  /**
   * 选项
   */
  readonly options: IPluginOptions;
}

export interface IPluginTransformDefinition {
  /**
   * 文件名
   */
  filename: string;
  /**
   * 文件内容
   */
  content: string;
}

export interface IPluginTransform {
  /**
   * 类型定义
   */
  definition?: IPluginTransformDefinition;
  /**
   * 接口数据
   */
  action?: Map<string, string>;
}

export interface IPlugin extends IPluginEvent {
  /**
   * 插件名称
   */
  readonly name: string;
  /**
   * 插件生成的语言，与选项的 `lang` 一致
   */
  readonly lang: string;
  /**
   * 插件入口
   */
  setup: (context: IPluginContext) => Promise<IPluginSetup> | IPluginSetup;
}

export interface IPluginSetup {
  /**
   * 未知类型
   */
  unknownType?: string;
  /**
   * 类型映射
   */
  typeMap: (
    convertFunc: (
      type: string,
      ref?: string,
      pluginOptions?: IPluginSetup,
    ) => string,
    type?: string,
  ) => Record<string, string>;
  template: IPluginTemplate;
  /**
   * 语言插件目录名称
   * @default `options.lang`
   */
  langDirectoryName?: string;
  /**
   * 模板文件路径
   * @default `./src/plugins/{{langDirectoryName}}/template`
   */
  templatePath?: string;
}

export type IPluginOptions = DefaultConfigOptions & Partial<IPluginSetup>;

interface IPluginTemplate {
  /**
   * 枚举
   */
  readonly enum: string;
  /**
   * 定义文件头
   */
  readonly definitionHeader: string;
  /**
   * 定义文件主体部分
   */
  readonly definitionBody: string;
  /**
   * 定义文件尾
   */
  readonly definitionFooter: string;
  /**
   * 接口文件导入
   */
  readonly actionImport: string;
  /**
   * 接口文件方法
   */
  readonly actionMethod: string;
}
