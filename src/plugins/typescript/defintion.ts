import Logs from "../../console.ts";
import { IDefinitionVirtualProperty } from "../../swagger.ts";
import {
  convertType,
  convertValue,
  propCommit,
  upperCase,
} from "../../util.ts";
import { getT } from "../../i18n/index.ts";

/**
 * Transforms an enum definition to a union type.
 *
 * @param {string} defName - The name of the enum definition.
 * @param {string} propName - The name of the enum property.
 * @param {Array<string>} data - An optional array of enum values.
 * @return {Object} An object representing the transformed enum definition.
 */
const parserEnumToUnionType = (
  defName: string,
  propName: string,
  data?: Array<string>,
) => {
  const _enumName = `${defName}${upperCase(propName)}`;
  const _unionValue = data?.map(convertValue).join("' | '");
  const _value = `export type ${_enumName} = '${_unionValue}'`;

  return {
    name: _enumName,
    value: _value,
  };
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
      const _enum = current.enumOption;
      const _enumData = parserEnumToUnionType(key, current.name, _enum);

      let _type = convertType(current.type, current.ref);

      if (_enum?.length && _enumData?.name) {
        _type = _enumData.name;
        _res.push(_enumData.value);
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
