import Logs from "../../console.ts";
import { IDefinitionVirtualProperty } from "../../swagger.ts";
import { convertType, convertValue, propCommit } from "../../util.ts";
import { getT } from "../../i18n/index.ts";

/**
 * Converts an enum to a union type.
 *
 * @param {string} type - the name of the union type
 * @param {Array<string>} data - the array of enum values
 * @return {string} the union type definition
 */
const parserEnumToUnionType = (
  type: string,
  data?: Array<string>,
) => {
  const _unionValue = data?.map(convertValue).join("' | '");

  return `export type ${type} = '${_unionValue}'`;
};

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty[]>,
) => {
  const _res: Array<string> = [];

  Logs.info(`${getT("$t(plugin.parserDef)")}...`);

  data.forEach((value, key) => {
    const props = value.reduce((prev, current) => {
      const _type = convertType(current.type, current.ref);
      const _enumOption = current.enumOption;
      const _enumData = parserEnumToUnionType(_type, _enumOption);

      // 添加枚举定义
      if (_enumOption?.length) {
        _res.push(_enumData);
      }

      prev.splice(
        prev.length - 1,
        0,
        `${propCommit(current.description ?? "")}${current.name}${
          current.required ? "" : "?"
        }: ${_type};`,
      );
      return prev;
    }, [`export interface ${key} {`, "}"]);

    _res.push(props.join("\n"));
  });

  Logs.info(getT("$t(plugin.parserDefDone)"));
  return _res.join("\n\n");
};
