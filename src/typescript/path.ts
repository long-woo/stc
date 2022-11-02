import {
  IPathParameter,
  IPathVirtualProperty,
  parameterCategory,
} from "../swagger.ts";
import { caseTitle, convertType, propCommit } from "../util.ts";
import Logs from "../console.ts";

const apiMap = new Map<string, Array<string>>();

interface IPathParams {
  name?: string;
  def?: Array<string>;
  ref?: string;
  commit?: string;
  required?: boolean;
  category?: parameterCategory;
}

interface IApiRealParams {
  path?: string;
  query?: string;
  body?: string;
  formData?: string;
  header?: string;
}

interface IApiParams {
  def?: Array<string>;
  defType?: string;
  ref?: IApiRealParams;
  commit?: Array<string>;
}

/**
 * 解析接口参数
 * @param parameters - 接口参数
 * @param key - 接口名称
 * @returns
 */
const parserParams = (parameters: IPathParameter[], key: string) =>
  parameters.reduce(
    (prev: IPathParams[], current) => {
      const _category = prev.find((item) => item.category === current.category);

      let _ref = `${current.name}${current.required ? "" : "?"}: ${
        convertType(current.type, current.ref)
      }`;

      // 若分类存在，组合成对象
      if (_category) {
        _ref = `${propCommit(current.description ?? "")}${_ref}`;

        if (_category.commit !== _category.name) {
          const _defName = `${caseTitle(key)}${
            caseTitle(current.category)
          }Params`;

          _category.def = [
            `export interface ${_defName} {`,
            `${propCommit(_category.commit ?? "")}${_category.ref ?? ""}`,
            _ref,
            "}",
          ];

          _category.commit = current.category;
          _category.name = current.category;
          _category.ref = `${current.category}: ${_defName}`;
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

/**
 * 接口注释
 * @param summary - 主注释
 * @param params - 参数注释
 * @param description -次要注释
 * @returns
 */
const methodCommit = (
  summary: string,
  params?: Array<string>,
  description?: string,
) => {
  const _commit = ["/**", `* ${summary}`];

  description && _commit.push(`* @description ${description}`);
  params?.length && _commit.push(...params);
  _commit.push("*/");

  return _commit.join("\n ");
};

/**
 * 解析接口
 * @param data - 接口信息
 */
export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  data.forEach((value, key) => {
    console.log(value);
    const tag = value.tags?.[0];
    if (!tag) {
      Logs.error(`${value.url} 未定义 tags`);
      return;
    }
    const _parameters = parserParams(value.parameters, key);

    const _params = _parameters.reduce((prev: IApiParams, current) => {
      const _def = current.ref;
      const _refName = current.category;

      prev.defType = current.def?.join("\n");
      prev.commit?.push(
        `* @param ${current.name} - ${current.commit ?? current.name}`,
      );
      _def && prev.def?.push(_def);

      if (prev.ref) {
        if (_refName === "body") {
          prev.ref.body = current.name;
        } else {
          _refName &&
            (prev.ref[_refName] = current.def?.length
              ? current.name
              : `{ ${current.name} }`);
        }
      }

      return prev;
    }, { commit: [], def: [], ref: {}, defType: "" });

    const _responseDef = convertType(
      value.response.type ?? "",
      value.response.ref,
    );

    // console.log(_params.defType);
    console.log(
      methodCommit(value.summary || key, _params.commit, value.description),
    );
    console.log(
      `export const ${key} = (${
        _params.def?.join(", ")
      }) => webClient.${value.method}<${_responseDef}>('${value.url}', ${
        JSON.stringify(_params.ref).replaceAll('"', "")
      })`,
    );
    const _defType = _params.defType;
    const _methodCommit = methodCommit(
      value.summary || key,
      _params.commit,
      value.description,
    );
    const _method = `export const ${key} = (${
      _params.def?.join(", ")
    }) => webClient.${value.method}<${_responseDef}>('${value.url}', ${
      JSON.stringify(_params.ref).replaceAll('"', " ")
    })`;

    if (apiMap.has(tag)) {
      const _apiMap = apiMap.get(tag);
    } else {
      // apiMap.set(tag, [_defType]);
    }
  });
};
