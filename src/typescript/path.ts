import { IPathParameter, IPathVirtualProperty } from "../swagger.ts";

interface IParams {
  path?: Array<IPathParameter>;
  query?: Array<IPathParameter>;
  body?: Array<IPathParameter>;
  formData?: Array<IPathParameter>;
}

export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  data.forEach((value, key) => {
    console.log(key);
    console.log(value);
    const _params: IParams = value.parameters.reduce(
      (prev: IParams, current) => {
        switch (current.category) {
          case "path":
            prev.path?.push(current);
            break;
          case "query":
            prev.query?.push(current);
            break;
          case "body":
            prev.body?.push(current);
            break;
          case "formData":
            prev.formData?.push(current);
            break;
        }

        return prev;
      },
      { path: [], query: [], body: [], formData: [] },
    );
    console.log(
      `export const ${key} = () => webClient.${value.method}(${value.url}, ${_params})`,
    );
  });
};
