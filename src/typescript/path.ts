import type {
  IApiParseResponse,
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
   * 接口参数类型
   */
  type?: string;
  /**
   * 接口参数的自定义类型
   */
  interface?: Array<string>;
  /**
   * 接口参数映射
   */
  refMap?: string;
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
  /**
   * 导入外部的定义
   */
  import?: string;
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
  defMap?: Array<string>;
  /**
   * 接口方法自定义的类型
   */
  interface?: Array<string>;
  /**
   * 接口方法传入到运行时方法的参数
   */
  refMap?: IApiRealParams;
  /**
   * 接口方法参数注释
   */
  commit?: Array<string>;
  /**
   * 接口的导入类型
   */
  import: Array<string>;
}

interface IApiFile {
  import: Array<string>;
  interface: Array<string>;
  export: Array<string>;
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
 * 解析接口参数，按参数类型分类
 * @param parameters - 接口参数
 * @param key - 接口名称
 */
const parserParams = (parameters: IPathParameter[], key: string) =>
  parameters?.reduce(
    (prev: IPathParams[], current) => {
      const _category = prev.find((item) => item.category === current.category);
      const _type = `${convertType(current.type, current.ref)}`;
      let _refMap = `${current.name}${current.required ? "" : "?"}: ${_type}`;

      // 同一类型参数，组合成对象
      if (_category) {
        _refMap = `${propCommit(current.description ?? "")}${_refMap}`;

        if (!_category.interface?.length) {
          const _defName = `${caseTitle(key)}${
            caseTitle(current.category)
          }Params`;

          _category.interface = [
            `export interface ${_defName} {`,
            `${propCommit(_category.commit ?? "")}${_category.refMap ?? ""}`,
            _refMap,
            "}",
          ];

          _category.commit = current.category;
          _category.name = current.category;
          _category.type = _defName;
          _category.refMap = `${current.category}: ${_defName}`;
        } else {
          _category.interface?.splice(
            _category.interface.length - 1,
            0,
            _refMap,
          );
        }
      } else {
        prev.push({
          name: current.name,
          type: _type,
          commit: current.description ?? current.category,
          required: current.required,
          category: current.category,
          refMap: _refMap,
          interface: [],
          import: current.ref,
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
  const _parameters = parserParams(parameters, key) || [];

  const _params = _parameters?.reduce((prev: IApiParams, current) => {
    const _defMap = current.refMap;
    const _refName = current.category;

    current.import && prev.import?.push(current.import);
    current.interface?.length &&
      prev.interface?.push(current.interface?.join("\n"));
    prev.commit?.push(
      `* @param ${current.name} - ${current.commit ?? current.name}`,
    );
    _defMap && prev.defMap?.push(_defMap);

    if (prev.refMap) {
      if (_refName === "body") {
        prev.refMap.body = current.name;
      } else {
        _refName &&
          (prev.refMap[_refName] = current.interface?.length
            ? current.name
            : `{ ${current.name} }`);
      }
    }

    return prev;
  }, { commit: [], defMap: [], refMap: {}, interface: [], import: [] });

  return _params;
};

/**
 * 解析响应对象
 * @param ref - 自定义类型
 * @returns
 */
const parseResponseRef = (ref: string): IApiParseResponse => {
  const _sliceIndex = ref.indexOf("«");
  const _imports = [];
  const _import = ref.slice(0, _sliceIndex > -1 ? _sliceIndex : undefined);

  if (_import && _import !== "Array") {
    _imports.push(_import);
  }

  const name = ref.replace(/«(.*)?»/g, (_key: string, _value: string) => {
    _value = _value.replace(/^List/, "Array");

    const res = parseResponseRef(_value);
    _imports.push(...res.import);

    const arr = res.name.split(/,\s*/g).map((_ref: string) => {
      return _ref;
    });

    return `<${arr.join(", ")}>`;
  });

  return { name, import: _imports };
};

/**
 * 生成 Api
 * @param data - 接口数据
 * @param key - 接口名称
 * @returns
 */
const generateApi = (data: IPathVirtualProperty, key: string) => {
  const _params = parserApiData(data.parameters, key);

  const _refResponse = parseResponseRef(data.response.ref ?? "");
  const _responseDef = convertType(
    data.response.type ?? "",
    _refResponse.name,
  );

  const _methodCommit = methodCommit(
    data.summary || key,
    _params?.commit,
    data.description,
  );
  const _methodParam = _params?.refMap
    ? `, ${JSON.stringify(_params.refMap, undefined, 2)?.replaceAll('"', "")}`
    : "";

  const _method = `${_methodCommit}
export const ${key} = (${
    _params?.defMap?.join(", ") ??
      ""
  }) => webClient.request<${_responseDef}>('${data.url}', '${data.method}'${_methodParam})`;

  return {
    import: [..._params.import, ..._refResponse.import],
    interface: _params.interface?.join("\n"),
    export: _method,
  };
};

/**
 * 解析接口
 * @param data - 接口信息
 */
export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  const apiMap = new Map<string, IApiFile>();

  data.forEach((item, key) => {
    const _tag = item.tags?.[0];
    if (!_tag) {
      Logs.error(`${item.url} 未定义 tags，跳过解析`);
      return;
    }

    const _api = generateApi(item, key);
    const _apiMap = apiMap.get(_tag);

    if (_apiMap) {
      if (_api.import) {
        const _import = Array.from(
          new Set([..._apiMap.import, ..._api.import]),
        );

        _apiMap.import = _import as string[];
      }
      _api.interface && _apiMap?.interface?.push(_api.interface);
      _apiMap?.export?.push(_api.export);
    } else {
      apiMap.set(_tag, {
        import: _api.import as string[],
        interface: _api.interface ? [_api.interface] : [],
        export: [_api.export],
      });
    }
  });

  return apiMap;
};
