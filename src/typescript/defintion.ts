import { IDefinitionVirtualProperty } from "../swagger.ts";
import { convertType, propCommit } from "../util.ts";

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty[]>,
) => {
  let _res = "";

  data.forEach((value, key) => {
    const props = value.reduce((prev, current) => {
      const _type = current.enumOption?.length
        ? current.enumOption.join(" | ")
        : convertType(current.type, current.ref);

      prev.splice(
        prev.length - 1,
        0,
        `${propCommit(current.description ?? "")}${current.name}${
          current.required ? "" : "?"
        }: ${_type};`,
      );
      return prev;
    }, [`export interface ${key} {`, "}"]);

    _res = props.join("\n");
  });

  return _res;
};
