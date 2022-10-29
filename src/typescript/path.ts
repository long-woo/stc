import { IPathVirtualProperty } from "../swagger.ts";

export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  data.forEach((value, key) => {
    console.log(key);
    console.log(value);
    // const params = value.parameters.
    `export const ${key} = ()`;
  });
};
