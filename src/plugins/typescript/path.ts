import type {
  IApiParseResponse,
  IApiParseResponseRef,
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  IPathVirtualProperty,
  IPathVirtualPropertyResponse,
} from "../../swagger.ts";
import { convertType, propCommit, upperCase } from "../../util.ts";
import Logs from "../../console.ts";
import { getT } from "../../i18n/index.ts";

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

interface IApiInternalDefinition {
  props: Array<string>;
  childProps: Array<string>;
}

/**
 * 接口注释
 * @param summary - 主注释
 * @param params - 参数注释
 * @param description -次要注释
 * @param title - 标题
 * @returns
 */
const methodCommit = (
  summary: string,
  params?: Array<string>,
  description?: string,
  title?: string,
) => {
  const _commit = ["/**", `* ${summary}`];

  title && _commit.push(`* @title ${title}`);
  description && _commit.push(`* @description ${description}`);
  params?.length && _commit.push(...params);
  _commit.push("*/");

  return _commit.join("\n ");
};

/**
 * 从给定的属性数组中获取属性，生成内部定义
 *
 * @param {IDefinitionVirtualProperty[]} properties - 属性
 * @param {string} name - 定义的名称
 */
const getInternalDefinition = (
  properties: IDefinitionVirtualProperty[],
  name: string,
): IApiInternalDefinition => {
  const _props = properties.reduce((prev: IApiInternalDefinition, current) => {
    let _type = convertType(current.type, current.typeX ?? current.ref);

    if (current.properties) {
      const _defName = `${name}${upperCase(current.name)}`;

      _type = convertType(current.type, _defName);

      const _childProps = getInternalDefinition(
        current.properties,
        _defName,
      );

      prev.childProps.push(..._childProps.props, ..._childProps.childProps);
    }

    prev.props.splice(
      prev.props.length - 1,
      0,
      `${
        propCommit(current.title ?? current.description ?? "")
      }${current.name}${current.required ? "" : "?"}: ${_type};`,
    );
    return prev;
  }, {
    props: properties.length ? [`export interface ${name} {`, "}"] : [],
    childProps: [],
  });

  return _props;
};

/**
 * 从给定的属性数组中获取属性，生成内部定义
 *
 * @param {IDefinitionVirtualProperty[]} properties - 属性
 * @param {string} name - 定义的名称
 */
const getDefinition = (
  properties: IDefinitionVirtualProperty[],
  name: string,
) => {
  const _props = getInternalDefinition(properties, name);
  const _defs = [..._props.props, ..._props.childProps];

  return _defs;
};

/**
 * 解析参数
 * @param parameters - 参数
 * @param action - 方法名称
 */
const parserParams = (parameters: IPathVirtualParameter, action: string) =>
  Object.keys(parameters).reduce((prev: IApiParams, current) => {
    const _params = parameters[current as keyof IPathVirtualParameter];
    const _multiParam = _params.length > 1;
    const _defName = `${upperCase(action)}${upperCase(current)}Params`;
    const _interface = _multiParam
      ? [`export interface ${_defName} {`, "}"]
      : [];

    _params.forEach((item, index) => {
      const _type = `${convertType(item.type, item.typeX ?? item.ref)}`;
      let _defMap = `${item.name}${item.required ? "" : "?"}: ${_type}`;

      // 接口导入外部的定义
      if (item.ref && !prev.import.includes(item.ref)) {
        prev.import.push(item.ref);
      }

      // 处理内部定义
      if (_multiParam || item.properties?.length) {
        // properties 存在时直接定义。
        if (item.properties?.length) {
          const _props = getDefinition(item.properties, _defName);

          if (_props.length) {
            prev.interface?.push(_props.join("\n"));
          }
        }

        // 合并同一类型的参数为新定义对象
        if (_multiParam) {
          _defMap = `${propCommit(item.description ?? "")}${_defMap}`;

          _interface.splice(
            _interface.length - 1,
            0,
            _defMap,
          );
        }

        if (index === 0) {
          // 接口参数注释
          prev.commit?.push(
            `* @param {${_defName}} ${current} - ${_defName}`,
          );
          // 接口形参
          prev.defMap?.push(`${current}: ${_defName}`);
          // 接口形参使用
          prev.refMap &&
            (prev.refMap[current as keyof IPathVirtualParameter] = current);
        }
      } else {
        const _defMapCommit = `* @param {${_type}} ${item.name} - ${
          item.description || item.name
        }`;
        // 找出第一个可选参数的位置
        const _optionalIndex = prev.defMap?.findIndex((_d) =>
          _d.includes("?:")
        ) ?? -1;

        if (_optionalIndex > -1) {
          // 接口参数注释
          prev.commit?.splice(_optionalIndex, 0, _defMapCommit);
          // 接口形参
          prev.defMap?.splice(_optionalIndex, 0, _defMap);
        } else {
          // 接口参数注释
          prev.commit?.push(_defMapCommit);
          // 接口形参
          prev.defMap?.push(_defMap);
        }

        // 接口形参使用
        if (prev.refMap) {
          prev.refMap[current as keyof IPathVirtualParameter] =
            current === "body" ? item.name : `{ ${item.name} }`;
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
const parseResponseRef = (ref: string): IApiParseResponseRef => {
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

const parseResponse = (
  response: IPathVirtualPropertyResponse,
  action: string,
): IApiParseResponse => {
  let _response: IApiParseResponse;

  if (response.properties?.length) {
    const _def = `${upperCase(action)}Response`;
    const _props = getDefinition(
      response.properties,
      `${upperCase(action)}Response`,
    );

    _response = {
      def: _def,
      interface: _props,
    };
  } else {
    const _refResponse = parseResponseRef(response.ref ?? "");
    const _responseDef = convertType(
      response.type ?? "",
      _refResponse.name,
    );

    _response = {
      def: _responseDef,
      import: _refResponse.import,
    };
  }

  return _response;
};

/**
 * 生成 Api
 * @param data - 接口数据
 * @param action - 接口名称
 * @returns
 */
const generateApi = (data: IPathVirtualProperty, action: string) => {
  const methodName = data.method.toUpperCase();
  Logs.info(`【${methodName}】${data.url}`);

  const _params = parserParams(data.parameters ?? {}, action);
  const _response = parseResponse(data.response, action);

  if (_response.def === "unknown") {
    Logs.warn(getT("$t(plugin.no_200_response)"));
  }

  const _methodCommit = methodCommit(
    data.summary || action,
    _params?.commit,
    data.description,
  );
  const _methodParam = _params.refMap && Object.keys(_params.refMap).length
    ? `, ${JSON.stringify(_params.refMap, undefined, 2)?.replaceAll('"', "")}`
    : "";

  const _method = `${_methodCommit}
export const ${action} = (${
    _params.defMap?.join(", ") ?? ""
  }) => webClient.request<${_response.def}>('${data.url}', '${methodName}'${_methodParam})`;

  return {
    import: [..._params.import, ...(_response.import ?? [])],
    interface: [...(_params.interface ?? []), ...(_response.interface ?? [])]
      ?.join("\n"),
    export: _method,
  };
};

/**
 * 解析接口
 * @param data - 接口信息
 */
export const parserPath = (data: Map<string, IPathVirtualProperty>) => {
  const apiMap = new Map<string, IApiFile>();

  Logs.info(`${getT("$t(plugin.parserAction)")}...`);
  data.forEach((item, key) => {
    const _tag = item.tag;
    if (!_tag) {
      Logs.error(getT("$t(plugin.no_tag)", { url: item.url }));
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

  Logs.info(getT("$t(plugin.parserActionDone)"));
  return apiMap;
};
