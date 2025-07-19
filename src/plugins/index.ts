import type { IPlugin, IPluginContext } from "./typeDeclaration.ts";
import Logs from "../console.ts";
import { getT } from "../i18n/index.ts";
import { TypeScriptPlugin } from "./typescript/index.ts";
import { JavaScriptPlugin } from "./javascript/index.ts";
import { DartPlugin } from "./dart/index.ts";
import { setupTemplate, validTemplate } from "./common.ts";
import { SwiftPlugin } from "./swift/index.ts";

export class PluginManager {
  private plugins: IPlugin[] = [
    TypeScriptPlugin,
    JavaScriptPlugin,
    DartPlugin,
    SwiftPlugin,
  ];

  register(plugins: IPlugin[]) {
    const pluginNames = plugins.map((item) => item.name).join(", ");
    // 如果插件已经存在，则不重复注册
    if (this.plugins.every((item) => pluginNames.includes(item.name))) {
      Logs.warn(
        getT("$t(plugin.alreadyRegistered)", { names: pluginNames }),
      );
      return;
    }

    this.plugins = [
      ...this.plugins,
      ...(Array.isArray(plugins) ? plugins : [plugins]),
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
      const pluginSetup = await plugin.setup(context);

      context.options.unknownType = pluginSetup.unknownType;
      context.options.typeMap = pluginSetup.typeMap;
      context.options.template = pluginSetup.template;
      context.options.langDirectoryName = pluginSetup.langDirectoryName;
      context.options.templatePath = pluginSetup.templatePath;

      validTemplate(pluginSetup.template);
      setupTemplate(context.options, {
        langDirectoryName: pluginSetup.langDirectoryName,
        path: pluginSetup.templatePath,
      });

      // 触发插件 onload 事件
      context.onLoad = (data) => plugin.onLoad?.(data, context.options);
      // 触发插件 onDefinition 事件
      context.onDefinition = (data) =>
        plugin.onDefinition?.(data, context.options);
      // 触发插件 onAction 事件
      context.onAction = (data) => plugin.onAction?.(data, context.options);
      // 触发插件 onTransform 事件
      context.onTransform = (def, action) =>
        plugin.onTransform?.(def, action, context.options);
      // 触发插件 onEnd 事件
      context.onEnd = () => plugin.onEnd?.(context.options);
    }
    Logs.info(getT("$t(plugin.allSetupDone)"));
  }
}
