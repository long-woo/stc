import { expandGlob } from "@std/fs";
import { Eta } from "@eta-dev/eta";

import type { IPluginOptions, IPluginSetup } from "./typeDeclaration.ts";
import Logs from "../console.ts";
import { getT } from "../i18n/index.ts";
import { readFile } from "../utils.ts";

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
 * Converts a given type to a string representation, taking into account the provided reference and plugin setup.
 *
 * @param {string|string[]} type - The type to be converted.
 * @param {string} [ref] - The reference type.
 * @param {pluginSetup | IPluginOptions} [pluginSetup] - The plugin setup.
 * @return {string} The converted type as a string.
 */
export const convertType = (
  type: string | string[],
  ref?: string,
  additionalRef?: string,
  pluginSetup?: IPluginSetup | IPluginOptions,
): string => {
  // 当只有 ref 或者 type 为 object 时，直接返回 ref
  if ((!type || type === "object") && ref) return ref;

  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type || (pluginSetup?.unknownType ?? "");

  const _action: Record<string, string> =
    pluginSetup?.typeMap?.(convertType, ref || additionalRef) ?? {};

  const _newType = Array.isArray(type) ? type : [type];
  const _type = _newType
    .map((item) => _action[item] || item)
    .filter((item) => item)
    .join(" | ");

  return _type;
};

export const validTemplate = (template: IPluginOptions["template"]) => {
  if (!template?.actionImport) {
    const _msg = getT("$t(plugin.template.actionImportRequired)");
    Logs.error(_msg);
    throw _msg;
  }

  if (!template.actionMethod) {
    const _msg = getT("$t(plugin.template.actionMethodRequired)");
    Logs.error(_msg);
    throw _msg;
  }

  if (!template.definitionHeader) {
    const _msg = getT("$t(plugin.template.definitionHeaderRequired)");
    Logs.error(_msg);
    throw _msg;
  }

  if (!template.definitionBody) {
    const _msg = getT("$t(plugin.template.definitionBodyRequired)");
    Logs.error(_msg);
    throw _msg;
  }

  if (!template.definitionFooter) {
    const _msg = getT("$t(plugin.template.definitionFooterRequired)");
    Logs.error(_msg);
    throw _msg;
  }

  if (!template.enum) {
    const _msg = getT("$t(plugin.template.enumRequired)");
    Logs.error(_msg);
    throw _msg;
  }
};

/**
 * 构建 ETA 模板映射表
 *
 * 扫描指定目录下的所有 `.eta` 模板文件，将其内容读取并构建为文件名到内容的映射表，
 * 最终生成一个包含所有模板内容的 `index.ts` 自动导出文件。
 *
 * @param dir - 包含 ETA 模板文件的目录路径
 * @returns Promise<void>
 */
export const buildEta = async (dir: string) => {
  const _files = await Array.fromAsync(expandGlob(`${dir}/*.eta`));
  const _fileMap = Object.create({});

  for await (const _file of _files) {
    const _filename = _file.name.split(".eta")[0];
    // 读取文件内容
    const _content = await readFile(_file.path);

    if (_filename) {
      _fileMap[_filename] = _content;
    }
  }

  return _fileMap;
};
