import { ISwaggerOptions } from "../swagger.ts";
import { IPlugin } from "./typeDeclaration.ts";

export class PluginManager {
  private plugins: IPlugin[] = [];

  register(plugin: IPlugin) {
    this.plugins.push(plugin);
  }

  async setupAll(options: ISwaggerOptions) {
    for (const plugin of this.plugins) {
      await plugin.setup(options);
    }
  }
}
