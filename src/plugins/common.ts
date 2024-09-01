import { Eta } from "@eta-dev/eta";

import type { IPluginOptions } from "./typeDeclaration.ts";

let etaInstance: Eta | null = null;

/**
 * Sets up the template engine with the provided options.
 *
 * @param {IPluginOptions} options - The plugin options to use for setting up the template.
 * @param {object} [template] - The template options.
 * @return {Eta} The set up template instance.
 */
export const setupTemplate = (
  options: IPluginOptions,
  template?: {
    /**
     * 语言插件目录名称
     * @default `options.lang`
     */
    langDirectoryName?: string;
    /**
     * 模板文件路径
     * @default `./src/plugins/{{langDirectoryName}}/template`
     */
    path?: string;
  },
) => {
  etaInstance = new Eta({
    views: template?.path ??
      `./src/plugins/${template?.langDirectoryName ?? options.lang}/template`,
  });

  return etaInstance;
};

/**
 * Renders a template based on the provided name and data.
 *
 * @param {string} name - The name of the template to render.
 * @param {Record<string, unknown>} data - The data to be used in the template.
 * @return {string} The rendered template as a string.
 */
export const renderTemplate = (name: string, data: Record<string, unknown>) => {
  if (!etaInstance) {
    throw new Error("Please call `setupTemplate` first.");
  }

  return etaInstance.render(name, data);
};

/**
 * Render a template with Eta.
 *
 * @param content - A string of template.
 * @param data - A object contains data.
 * @returns A rendered string.
 */
export const renderEtaString = (
  content: string,
  data: Record<string, unknown>,
) => {
  if (!etaInstance) {
    throw new Error("Please call `setupTemplate` first.");
  }

  return etaInstance?.renderString(content, data);
};

/**
 * Converts a given type to a string representation, taking into account the provided reference and plugin options.
 *
 * @param {string|string[]} type - The type to be converted.
 * @param {string} [ref] - The reference type.
 * @param {IPluginOptions} [pluginOptions] - The plugin options.
 * @return {string} The converted type as a string.
 */
export const convertType = (
  type: string | string[],
  ref?: string,
  pluginOptions?: IPluginOptions,
): string => {
  // 当只有 ref 或者 type 为 object 时，直接返回 ref
  if ((!type || type === "object") && ref) return ref;

  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type || (pluginOptions?.unknownType ?? "");

  const _action: Record<string, string> =
    pluginOptions?.typeMap?.(convertType, ref) ?? {};

  const _newType = Array.isArray(type) ? type : [type];
  const _type = _newType
    .map((item) => _action[item] || item)
    .filter((item) => item)
    .join(" | ");

  return _type;
};
