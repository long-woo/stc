import { IPathParameter, IPathVirtualProperty } from "../swagger.ts";
import { caseTitle, convertType, propCommit } from "../util.ts";

interface IParams {
  header?: Array<IPathParameter>;
  path?: Array<IPathParameter>;
  query?: Array<IPathParameter>;
  body?: Array<IPathParameter>;
  formData?: Array<IPathParameter>;
}

export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  data.forEach((value, key) => {
    console.log(key);
    console.log(value);
    const _params = value.parameters.reduce(
      (prev: IParams, current) => {
        // const _item = `${propCommit(current.description ?? "")}${current.name}${
        //   current.required ? "" : "?"
        // }: ${convertType(current.type, current.ref)}`;

        // if (!prev[current.category]?.length) {
        //   prev[current.category]?.push(
        //     // `interface ${caseTitle(key)}${caseTitle(current.category)}Params {`,
        //     _item,
        //     // "}",
        //   );
        // }
        // // else {
        // //   prev[current.category]?.splice(
        // //     (prev[current.category]?.length ?? 0) - 1,
        // //     0,
        // //     _item,
        // //   );
        // // }
        prev[current.category]?.push(current);
        // prev[current.category]?.push(
        //   _item,
        // );

        return prev;
      },
      {
        header: [],
        path: [],
        query: [],
        body: [],
        formData: [],
      },
    );
    console.log(_params);
    const _responseDef = convertType(
      value.response.type ?? "",
      value.response.ref,
    );
    // path/query/body/formData - id:number or {id: number, name: string}
    console.log(
      `export const ${key} = () => webClient.${value.method}<${_responseDef}>('${value.url}')`,
    );
  });
};
