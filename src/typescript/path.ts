import {
  IPathParameter,
  IPathVirtualProperty,
  parameterCategory,
} from "../swagger.ts";
import { caseTitle, convertType, propCommit } from "../util.ts";
import Logs from "../console.ts";

interface IPathParams {
  /**
   * 接口参数名称
   */
  name?: string;
  /**
   * 接口参数的自定义类型
   */
  def?: Array<string>;
  /**
   * 接口参数
   */
  ref?: string;
  /**
   * 接口参数注释
   */
  commit?: string;
  /**
   * 接口参数是否必须
   */
  required?: boolean;
  /**
   * 接口参数分类
   */
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
  /**
   * 接口方法形参
   */
  def?: Array<string>;
  /**
   * 接口方法自定义的类型
   */
  defType?: string;
  /**
   * 接口方法传入到运行时方法的参数
   */
  ref?: IApiRealParams;
  /**
   * 接口方法参数注释
   */
  commit?: Array<string>;
}

interface IApiFile {
  import?: Array<string>;
  interface?: Array<string>;
  export?: Array<string>;
}

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
 * 解析接口参数
 * @param parameters - 接口参数
 * @param key - 接口名称
 * @returns
 */
const parserParams = (parameters: IPathParameter[], key: string) =>
  parameters?.sort((_a, _b) => Number(_b.required) - Number(_a.required))
    ?.reduce(
      (prev: IPathParams[], current) => {
        const _category = prev.find((item) =>
          item.category === current.category
        );

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
 * 解析接口数据
 * @param parameters - 接口参数
 * @param key - 接口名称
 * @returns
 */
const parserApiData = (parameters: IPathParameter[], key: string) => {
  const _parameters = parserParams(parameters, key);

  const _params = _parameters?.reduce((prev: IApiParams, current) => {
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

  return _params;
};

/**
 * 生成 Api
 * @param data - 接口数据
 * @param key - 接口名称
 * @returns
 */
const generateApi = (data: IPathVirtualProperty, key: string) => {
  const _params = parserApiData(data.parameters, key);

  const _import = data.response.ref;
  const _responseDef = convertType(
    data.response.type ?? "",
    _import,
  );

  const _defType = _params?.defType;
  const _methodCommit = methodCommit(
    data.summary || key,
    _params?.commit,
    data.description,
  );
  const _methodParam = _params?.ref
    ? `, ${JSON.stringify(_params.ref, undefined, 2)?.replaceAll('"', "")}`
    : "";

  const _method = `${_methodCommit}
export const ${key} = (${_params?.def?.join(", ") ??
    ""}) => webClient.${data.method}<${_responseDef}>('${data.url}'${_methodParam})`;

  return {
    import: _import,
    interface: _defType,
    export: _method,
  };
};

/**
 * 解析接口
 * @param data - 接口信息
 */
export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  const apiMap = new Map<string, IApiFile>();

  data.forEach((value, key) => {
    const _tag = value.tags?.[0];
    if (!_tag) {
      Logs.error(`${value.url} 未定义 tags，跳过解析`);
      return;
    }

    const _api = generateApi(value, key);

    if (apiMap.has(_tag)) {
      const _apiMap = apiMap.get(_tag);

      if (_api.import && !_apiMap?.import?.includes(_api.import)) {
        _apiMap?.import?.push(_api.import);
      }

      _api.interface && _apiMap?.interface?.push(_api.interface);
      _apiMap?.export?.push(_api.export);
    } else {
      apiMap.set(_tag, {
        import: _api.import ? [_api.import] : [],
        interface: _api.interface ? [_api.interface] : [],
        export: [_api.export],
      });
    }
  });

  return apiMap;
};
