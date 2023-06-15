import {
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
  onTransform?: (
    def: Map<string, IDefinitionVirtualProperty[]>,
    action: Map<string, IPathVirtualProperty>,
  ) => IPluginTransform;
  /**
   * 结束事件
   */
  onEnd?: () => void;
}

export interface IPluginContext extends IPluginEvent {
  /**
   * 选项
   */
  options: ISwaggerOptions;
}

export interface IPluginTransform {
  /**
   * 类型定义
   */
  definition: string;
  /**
   * 接口数据
   */
  action: Map<string, string>;
}

export interface IPlugin extends IPluginEvent {
  /**
   * 插件名称
   */
  name: string;
  /**
   * 插件入口
   */
  setup: (context: IPluginContext) => Promise<void> | void;
}
