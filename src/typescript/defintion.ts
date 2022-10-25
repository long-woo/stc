import { IDefinitionVirtualProperty } from "../swagger.ts";
import { propCommit } from "../util.ts";

const convertType = (type: string, ref = "any") => {
  const _action: Record<string, string> = {
    string: "string",
    integer: "number",
    boolean: "boolean",
    array: `Array<${ref}>`,
  };

  return _action[type];
};

export const parserDefinition = (
  mapData: Map<string, IDefinitionVirtualProperty[]>,
) => {
  mapData.forEach((value, key) => {
    console.log(`=================${key}==================`);
    console.log(value);
    const props = value.reduce((prev, current) => {
      const _type = current.enumOption?.length
        ? current.enumOption.join(" | ")
        : convertType(current.type);

      prev.splice(
        prev.length - 1,
        0,
        `${propCommit(current.description ?? "")}${current.name}${
          current.required ? "" : "?"
        }: ${_type};`,
      );
      return prev;
    }, [`export interface ${key} {`, "}"]);
    console.log(props.join("\n"));
  });
};
