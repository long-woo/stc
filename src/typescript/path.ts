import type {
  IApiParseResponse,
  IPathVirtualParameter,
  IPathVirtualProperty,
} from "../swagger.ts";
import { convertType, propCommit, upperCase } from "../util.ts";
import Logs from "../console.ts";

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
 * 解析参数
 * @param parameters - 参数
 * @param action - 方法名称
 */
const parserParams = (parameters: IPathVirtualParameter, action: string) =>
  Object.keys(parameters).reduce((prev: IApiParams, current) => {
    const _params = parameters[current as keyof IPathVirtualParameter];
    let _interface: string[] = [];

    _params.forEach((item, index) => {
      const _type = `${convertType(item.type, item.ref)}`;
      let _defMap = `${item.name}${item.required ? "" : "?"}: ${_type}`;
      const _defName = `${upperCase(action)}${upperCase(current)}Params`;

      // 接口导入外部的定义
      if (item.ref && !prev.import.includes(item.ref)) {
        prev.import.push(item.ref);
      }

      // 接口内部定义，同一类型的参数合并为新定义对象
      if (index > 0) {
        _defMap = `${propCommit(item.description ?? "")}${_defMap}`;

        if (index === 1) {
          _interface = [
            `export interface ${_defName} {`,
            `${propCommit(item.description ?? "")}${_defMap}`,
            _defMap,
            "}",
          ];
        } else {
          _interface?.splice(
            _interface.length - 1,
            0,
            _defMap,
          );
        }
      }

      // 接口参数注释
      prev.commit?.push(
        `* @param ${item.name} - ${item.description ?? item.name}`,
      );
      // 接口形参
      prev.defMap?.push(_defMap);
      action === "updatePetWithForm" && console.log(_defMap, index);
      // 接口形参使用
      if (prev.refMap) {
        if (current === "body") {
          prev.refMap.body = item.name;
        } else {
          current &&
            (prev.refMap[current as keyof IPathVirtualParameter] =
              _interface.length ? item.name : `{ ${item.name} }`);
        }
      }
    });

    if (_interface.length) {
      prev.interface?.push(_interface.join("\n"));
    }
    return prev;
  }, { commit: [], defMap: [], refMap: {}, interface: [], import: [] });

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
  const _params = parserParams(data.parameters ?? {}, key);

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
  }) => webClient.request<${_responseDef}>('${data.url}', '${data.method.toUpperCase()}'${_methodParam})`;

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
