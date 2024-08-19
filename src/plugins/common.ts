import { Eta } from "x/eta@v3.4.0/src/index.ts";

import type { IPluginOptions } from "./typeDeclaration.ts";
import { convertValue } from "../common.ts";

let etaInstance: Eta | null = null;

/**
 * Sets up a template instance based on the provided options and language.
 *
 * @param {IPluginOptions} options - The plugin options to use for setting up the template.
 * @param {string} [lang] - The optional language to use for the template.
 * @return {Eta} The set up template instance.
 */
export const setupTemplate = (options: IPluginOptions, lang?: string) => {
  etaInstance = new Eta({
    views: `./src/plugins/${lang ?? options.lang}/template`,
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

/**
 * Converts an enum to a union type.
 *
 * @param {string} type - the name of the union type
 * @param {string[]} data - the array of enum values
 * @return {string} the union type definition
 */
export const parserEnum = (
  type: string,
  data?: string[],
) => {
  if (!data?.length) return "";

  const _unionValue = data?.map(convertValue).join(",\n\t");

  return `enum ${type} {
  ${_unionValue}
}\n`;
};
