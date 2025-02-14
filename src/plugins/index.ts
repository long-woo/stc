import type { IPlugin, IPluginContext } from "./typeDeclaration.ts";
import Logs from "../console.ts";
import { getT } from "../i18n/index.ts";
import { TypeScriptPlugin } from "./typescript/index.ts";
import { JavaScriptPlugin } from "./javascript/index.ts";
import { DartPlugin } from "./dart/index.ts";
// import { SwiftPlugin } from "./swift/index.ts";

export class PluginManager {
  private plugins: IPlugin[] = [
    TypeScriptPlugin,
    JavaScriptPlugin,
    DartPlugin,
    // SwiftPlugin,
  ];

  register(plugin: IPlugin | IPlugin[]) {
    this.plugins = [
      ...this.plugins,
      ...(Array.isArray(plugin) ? plugin : [plugin]),
    ];
  }

  async setupAll(context: IPluginContext) {
    const _options = context.options;

    for (const plugin of this.plugins) {
      // 加载指定 lang 的插件
      const _langs = Array.isArray(plugin.lang) ? plugin.lang : [plugin.lang];
      if (!_langs.includes(_options.lang ?? "")) {
        continue;
      }

      Logs.info(getT("$t(plugin.name)", { name: plugin.name }));

      if (!plugin.setup) {
        Logs.warn(getT("$t(plugin.noSetupMethod)", { name: plugin.name }));
        continue;
      }

      // 执行插件 setup 方法
      await plugin.setup(_options);

      // 触发插件 onload 事件
      context.onLoad = (data) => plugin.onLoad?.(data);
      // 触发插件 onDefinition 事件
      context.onDefinition = (data) => plugin.onDefinition?.(data);
      // 触发插件 onAction 事件
      context.onAction = (data) => plugin.onAction?.(data);
      // 触发插件 onTransform 事件
      context.onTransform = (def, action) => plugin.onTransform?.(def, action);
      // 触发插件 onEnd 事件
      context.onEnd = () => plugin.onEnd?.();
    }
    Logs.info(getT("$t(plugin.allSetupDone)"));
  }
}
