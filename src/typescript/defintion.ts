import { IDefinitionVirtualProperty } from "../swagger.ts";
import { convertType, propCommit, upperCase } from "../util.ts";

/**
 * 解析枚举
 * @param defName - 定义类型的名称
 * @param propName - 属性名称
 * @param data - 枚举数据
 * @returns
 */
const parserEnum = (
  defName: string,
  propName: string,
  data?: Array<string>,
) => {
  const _enumName = `${defName}${upperCase(propName)}`;

  return data?.reduce((prev, current, index) => {
    const _comma = index === data.length - 1 ? "" : ",";

    prev.value.splice(
      prev.value.length - 1,
      0,
      `\t${current} = '${current}'${_comma}`,
    );
    return prev;
  }, { name: _enumName, value: [`export enum ${_enumName} {`, "}"] });
};

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty[]>,
) => {
  const _res: Array<string> = [];

  data.forEach((value, key) => {
    const props = value.reduce((prev, current) => {
      const _enum = current.enumOption;
      const _enumData = parserEnum(key, current.name, _enum);

      let _type = convertType(current.type, current.ref);

      if (_enum?.length && _enumData?.name) {
        _type = _enumData.name;
        _res.push(_enumData.value.join("\n"));
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

  return _res.join("\n\n");
};
