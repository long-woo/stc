import Logs from "/src/console.ts";
import { IPlugin, IPluginContext } from "./typeDeclaration.ts";

export class PluginManager {
  private plugins: IPlugin[] = [];

  register(plugin: IPlugin) {
    this.plugins.push(plugin);
  }

  async setupAll(context: IPluginContext) {
    for (const plugin of this.plugins) {
      Logs.info(`加载插件: ${plugin.name}`);
      await plugin.setup(context.options);

      context.onLoad = plugin.onLoad;

      context.onDefinition = (data) => {
        plugin.onDefinition?.(data);
      };

      context.onAction = plugin.onAction;
    }
    Logs.info("插件加载完成\n");
  }
}
