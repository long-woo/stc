import type { IPluginOptions } from "./typeDeclaration.ts";
import { convertValue } from "../common.ts";

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
}`;
};
