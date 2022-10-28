import { IDefinitionVirtualProperty } from "../swagger.ts";
import { createFile, propCommit } from "../util.ts";

/**
 * 类型转换为 typescript 的
 * @param type - 类型
 * @param ref - 引用
 * @returns
 */
const convertType = (type: string, ref = "any") => {
  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type;

  const _action: Record<string, string> = {
    string: "string",
    integer: "number",
    boolean: "boolean",
    array: `Array<${ref}>`,
  };

  return _action[type];
};

/**
 * 解析定义
 * @param mapData - 参数
 */
export const parserDefinition = (
  mapData: Map<string, IDefinitionVirtualProperty[]>,
) => {
  let _res = "";

  mapData.forEach((value, key) => {
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
