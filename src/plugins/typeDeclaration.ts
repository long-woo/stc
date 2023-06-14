import { ISwaggerOptions } from "../swagger.ts";

export interface IPlugin {
  /**
   * 插件名称
   */
  name: string;
  /**
   * 插件入口
   */
  setup: (options: ISwaggerOptions) => Promise<void> | void;
}
