import { convertValue } from "../../common.ts";

/**
 * Converts an enum to a union type.
 *
 * @param {string} type - the name of the union type
 * @param {Array<string>} data - the array of enum values
 * @return {string} the union type definition
 */
export const parserEnumToUnionType = (
  type: string,
  data?: Array<string>,
) => {
  const _unionValue = data?.map(convertValue).join("' | '");

  return `export type ${type} = '${_unionValue}'`;
};
