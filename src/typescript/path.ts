import { IPathVirtualProperty } from "../swagger.ts";
import { caseTitle, convertType, propCommit } from "../util.ts";

interface IPathParams {
  name?: string;
  def?: Array<string>;
  ref?: string;
  commit?: string;
  required?: boolean;
  category?: string;
}

/**
 * 解析接口
 * @param data - 接口信息
 */
export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  data.forEach((value, key) => {
    console.log(key);
    console.log(value);
    const _parameters = value.parameters.reduce(
      (prev: IPathParams[], current) => {
        const _category = prev.find((item) =>
          item.category === current.category
        );

        let _ref = `${current.name}${current.required ? "" : "?"}: ${
          convertType(current.type, current.ref)
        }`;

        if (_category) {
          _ref = `${propCommit(current.description ?? "")}${_ref}`;

          if (_category.commit !== _category.name) {
            const _defName = `${caseTitle(key)}${
              caseTitle(current.category)
            }Params`;

            _category.commit = current.category;
            _category.name = current.category;
            _category.ref = `${current.category}: ${_defName}`;
            _category.def = [`export interface ${_defName} {`, _ref, "}"];
          } else {
            _category.def?.splice(_category.def.length - 1, 0, _ref);
          }
        } else {
          prev.push({
            name: current.name,
            commit: current.description ?? current.category,
            required: current.required,
            category: current.category,
            ref: _ref,
            def: [],
          });
        }

        return prev;
      },
      [],
    );
    console.log(_parameters);

    const _responseDef = convertType(
      value.response.type ?? "",
      value.response.ref,
    );

    // console.log(`${_params.def?.join("\n")}`, _params.commit, _params.name);

    console.log(
      `export const ${key} = () => webClient.${value.method}<${_responseDef}>('${value.url}')`,
    );
  });
};
