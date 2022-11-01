import { IPathParameter, IPathVirtualProperty } from "../swagger.ts";
import { caseTitle, convertType, propCommit } from "../util.ts";

interface IParamsCategory {
  header?: Array<IPathParameter>;
  path?: Array<IPathParameter>;
  query?: Array<IPathParameter>;
  body?: Array<IPathParameter>;
  formData?: Array<IPathParameter>;
}

interface IPathParams {
  name?: string;
  def?: Array<string>;
  ref?: string;
  commit?: string;
  required?: boolean;
}

/**
 * 解析接口参数
 * @param params - 接口参数
 * @param key - 接口名
 * @param category - 接口参数分类
 * @returns
 */
const parserPathParams = (
  params: IParamsCategory,
  key: string,
  category: "header" | "path" | "query" | "body" | "formData",
) =>
  params[category]?.reduce(
    (prev: IPathParams, current, index, arr) => {
      let _item = `${current.name}${current.required ? "" : "?"}: ${
        convertType(current.type, current.ref)
      }`;

      if (arr.length === 1) {
        prev = {
          name: current.name,
          commit: current.description ?? current.category,
          ref: _item,
          required: current.required,
        };
      } else {
        _item = `${propCommit(current.description ?? "")}${_item}`;

        if (index === 0) {
          const _defName = `${caseTitle(key)}${
            caseTitle(current.category)
          }Params`;

          prev = {
            name: current.category,
            commit: current.category,
            ref: `${current.category}: ${_defName}`,
            def: [
              `export interface ${_defName} {`,
              _item,
              "}",
            ],
          };
        } else {
          prev.def?.splice(prev.def.length - 1, 0, _item);
        }
      }

      return prev;
    },
    {},
  );

/**
 * 解析接口
 * @param data - 接口信息
 */
export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  data.forEach((value, key) => {
    console.log(key);
    console.log(value);
    const _params = value.parameters.reduce(
      (prev: IParamsCategory, current) => {
        prev[current.category]?.push(current);
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

    const _header = parserPathParams(_params, key, "header");
    const _path = parserPathParams(_params, key, "path");
    const _query = parserPathParams(_params, key, "query");
    const _body = parserPathParams(_params, key, "body");
    const _formData = parserPathParams(_params, key, "formData");

    const _paramsDef = [
      _path?.ref,
      _body?.ref,
      _formData?.ref,
      _query?.ref,
      _header?.ref,
    ].filter((item) => item);

    const _responseDef = convertType(
      value.response.type ?? "",
      value.response.ref,
    );

    console.log(
      `export const ${key} = (${_paramsDef.toString()}) => webClient.${value.method}<${_responseDef}>('${value.url}')`,
    );
  });
};
