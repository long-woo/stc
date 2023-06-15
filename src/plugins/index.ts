import { IPlugin, IPluginContext } from "./typeDeclaration.ts";

export class PluginManager {
  private plugins: IPlugin[] = [];

  register(plugin: IPlugin) {
    this.plugins.push(plugin);
  }

  async setupAll(context: IPluginContext) {
    for (const plugin of this.plugins) {
      await plugin.setup(context);

      // plugin.onLoad?.()
    }
  }
}
