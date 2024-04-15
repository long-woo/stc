import type {
  IDefinitionVirtualProperty,
  IPathVirtualProperty,
  ISwaggerOptions,
  ISwaggerResult,
} from "../swagger.ts";

interface IPluginEvent {
  /**
   * 加载完成事件
   * @param data - 原始数据
   */
  onLoad?: (data: ISwaggerResult) => void;
  /**
   * 类型定义事件
   * @param data - 类型定义
   */
  onDefinition?: (data: Map<string, IDefinitionVirtualProperty[]>) => void;
  /**
   * 接口数据事件
   * @param data - 接口数据
   */
  onAction?: (data: Map<string, IPathVirtualProperty>) => void;
  /**
   * 转换事件
   * @param def - 类型定义
   * @param action - 接口数据
   */
  onTransform: (
    def: Map<string, IDefinitionVirtualProperty[]>,
    action: Map<string, IPathVirtualProperty>,
  ) => Promise<IPluginTransform> | IPluginTransform;
  /**
   * 结束事件
   */
  onEnd?: () => Promise<void> | void;
}

export interface IPluginContext extends Partial<IPluginEvent> {
  /**
   * 选项
   */
  readonly options: ISwaggerOptions;
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
  readonly lang: string | string[];
  /**
   * 插件入口
   */
  setup: (options: ISwaggerOptions) => Promise<void> | void;
}
