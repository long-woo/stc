import type {
  IApiParseResponse,
  IApiParseResponseRef,
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  IPathVirtualProperty,
  IPathVirtualPropertyResponse,
} from "../swagger.ts";
import type { IPluginOptions } from "./typeDeclaration.ts";
import { camelCase, upperCase } from "../common.ts";
import { convertType, parserEnum, renderTemplate } from "./common.ts";
import Logs from "../console.ts";
import { getT } from "../i18n/index.ts";

interface IApiParams {
  /**
   * 外部导入
   */
  imports?: string[];
  /**
   * 必填参数
   */
  requiredParams?: IDefinitionVirtualProperty[];
  /**
   * 可选参数
   */
  optionalParams?: IDefinitionVirtualProperty[];
  /**
   * 内部定义
   */
  definitions?: string[];
}

interface IApiFile {
  imports: string[];
  definitions: string[];
  methods: string[];
}

interface IApiInternalDefinition {
  definitions: string[];
  childDefinitions: string[];
}

let pluginOptions: IPluginOptions;

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
  let _defHeader = "", _defFooter = "";

  if (properties.length) {
    _defHeader = renderTemplate("definitionHeader", { defName: name });
    _defFooter = renderTemplate("definitionFooter", {
      defName: name,
      props: properties,
    });
  }

  const _defs = properties.reduce((prev: IApiInternalDefinition, current) => {
    let _type = convertType(
      current.type,
      current.typeX ?? current.ref,
      pluginOptions,
    );

    if (current.properties?.length) {
      const _defName = `${name}${upperCase(current.name)}`;
      _type = convertType(current.type, _defName, pluginOptions);

      const _childDefinition = getInternalDefinition(
        current.properties,
        _defName,
      );

      prev.childDefinitions.push(
        ..._childDefinition.definitions,
        ..._childDefinition.childDefinitions,
      );
    }

    const _defBody = renderTemplate("definitionBody", {
      propCommit: current.title || current.description,
      propType: _type,
      prop: current,
    });

    prev.definitions.splice(prev.definitions.length - 1, 0, _defBody);
    return prev;
  }, {
    definitions: properties.length ? [_defHeader, _defFooter] : [],
    childDefinitions: [],
  });

  return _defs;
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
  const _def = getInternalDefinition(properties, name);
  const _defs = [..._def.definitions, ..._def.childDefinitions];

  return _defs;
};

/**
 * 解析参数
 * @param parameters - 参数
 * @param action - 方法名称
 */
const parseParams = (parameters: IPathVirtualParameter, action: string) =>
  Object.keys(parameters).reduce((prev: IApiParams, current) => {
    const _category = current as keyof IPathVirtualParameter;
    const _params = parameters[_category];
    const _multiParam = _params.length > 1;
    const _defName = camelCase(`${action}_${current}_params`, true);

    // 形参
    let _formalParam = {
      name: current,
      category: current,
      type: _defName,
      description: "",
    };

    _params.forEach((item, index) => {
      const _type = item.enumOption?.length
        ? camelCase(`${_defName}_${item.name}`, true)
        : `${convertType(item.type, item.typeX ?? item.ref, pluginOptions)}`;

      // 外部引用
      if (item.ref && !prev.imports?.includes(item.ref)) {
        prev.imports?.push(item.ref);
      }

      /* #region 内部定义 */
      // 定义参数枚举
      if (item.enumOption?.length) {
        const _enumParam = parserEnum(_type, item.enumOption);

        prev.definitions?.push(_enumParam);
      }

      // properties 存在时直接定义
      if (item.properties?.length) {
        const _defs = getDefinition(item.properties, _defName);

        prev.definitions?.push(_defs.join("\n"));
      }

      // 同类型的参数进行合并成新对象
      if (_multiParam) {
        if (index === 0) {
          prev.definitions?.push(
            renderTemplate("definitionHeader", { defName: _defName }),
          );
        }

        prev.definitions?.push(renderTemplate("definitionBody", {
          propCommit: item.title || item.description,
          prop: item,
          propType: _type,
        }));

        if (index === _params.length - 1) {
          prev.definitions?.push(
            "",
            renderTemplate("definitionFooter", {
              defName: _defName,
              props: _params,
            }),
          );
        }
      }
      /* #endregion */

      if (!_multiParam) {
        _formalParam = {
          name: item.name,
          category: current,
          type: _type,
          description: (item.title || item.description) ?? "",
        };

        if (item.required) {
          // 必填参数
          prev.requiredParams?.push(_formalParam);
        } else {
          // 可选参数
          prev.optionalParams?.push(_formalParam);
        }
      }
    });

    if (_multiParam) {
      prev.requiredParams?.push(_formalParam);
    }

    return prev;
  }, {
    imports: [],
    requiredParams: [],
    optionalParams: [],
    definitions: [],
  });

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
    const _defName = `${upperCase(action)}Response`;
    const _definitions = getDefinition(
      response.properties,
      _defName,
    );

    _response = {
      name: _defName,
      type: _defName,
      definitions: _definitions,
    };
  } else {
    const _defName = parseResponseRef(response.ref ?? "");
    const _defNameType = convertType(
      response.type ?? "",
      _defName.name,
      pluginOptions,
    );

    _response = {
      name: _defName.name,
      type: _defNameType,
      imports: _defName.import,
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

  const _params = parseParams(data.parameters ?? {}, action);
  const _response = parseResponse(data.response, action);

  if (!_response.name) {
    Logs.warn(getT("$t(plugin.no_200_response)"));
  }

  const _apiMethod = renderTemplate("actionMethod", {
    summary: data.summary,
    description: data.description,
    methodName: upperCase(action),
    params: [
      ..._params.requiredParams ?? [],
      ..._params.optionalParams ?? [],
    ],
    responseName: _response.name,
    responseType: _response.type,
    action: action,
    url: data.url,
    method: data.method,
  });

  return {
    imports: [..._params.imports ?? [], ..._response.imports ?? []],
    definition: [
      ...(_params.definitions ?? []),
      ...(_response.definitions ?? []),
    ]
      ?.join("\n"),
    method: _apiMethod,
  };
};

/**
 * Generates a map of action files based on the provided data.
 *
 * @param {Map<string, IPathVirtualProperty>} data - The data used to generate the action files.
 * @return {Map<string, IApiFile>} - A map of action files, where the key is the tag and the value is the corresponding IApiFile object.
 */
const getActionFiles = (data: Map<string, IPathVirtualProperty>) => {
  const _actionFileMap = new Map<string, IApiFile>();

  Logs.info(`${getT("$t(plugin.parserAction)")}...`);
  data.forEach((item, key) => {
    const _tag = item.tag;

    if (!_tag) {
      Logs.error(getT("$t(plugin.no_tag)", { url: item.url }));
      return;
    }

    const _apiData = generateApi(item, key);
    const _actionFile = _actionFileMap.get(_tag);

    if (_actionFile) {
      if (_apiData.imports) {
        // 导入内容去重
        const _imports = Array.from(
          new Set([..._actionFile.imports, ..._apiData.imports]),
        );

        _actionFile.imports = _imports;
      }

      _apiData.definition &&
        _actionFile?.definitions?.push(_apiData.definition);
      _actionFile?.methods?.push(_apiData.method);
    } else {
      _actionFileMap.set(_tag, {
        imports: _apiData.imports,
        definitions: _apiData.definition ? [_apiData.definition] : [],
        methods: [_apiData.method],
      });
    }
  });

  Logs.info(getT("$t(plugin.parserActionDone)"));
  return _actionFileMap;
};

/**
 * Parses actions from the given data and generates a map of action content.
 *
 * @param {Map<string, IPathVirtualProperty>} data - The data to parse actions from.
 * @param {string} defFileName - The name of the definition file.
 * @return {Map<string, string>} A map of action content where the key is the action file name and the value is the action content.
 */
export const parserActions = (
  data: Map<string, IPathVirtualProperty>,
  defFileName: string,
  options: IPluginOptions,
) => {
  pluginOptions = options;

  const _actionContentMap = new Map<string, string>();
  const _actionFileMap = getActionFiles(data);

  _actionFileMap.forEach((action, key) => {
    // 处理导入文件相对路径，根据 key 中是否存在 `/`
    const _keyPath = key.split("/");
    // 移除一项
    _keyPath.pop();
    const _importPath = _keyPath.reduce((prev, _) => {
      if (prev === "./") {
        prev = "";
      }

      prev += "../";
      return prev;
    }, "./");

    const _apiImport = [
      renderTemplate("actionImport", {
        importPath: _importPath,
        imports: action.imports,
        typeFileName: defFileName,
      }),
    ];
    const _apiContent: Array<string> = [];

    _apiContent.push(_apiImport.join("\n"));
    action.definitions?.length &&
      _apiContent.push(action.definitions?.join("\n\n"));
    action.methods?.length && _apiContent.push(action.methods.join("\n\n"));

    _actionContentMap.set(`${key}.${options.lang}`, _apiContent.join("\n\n"));
  });

  return _actionContentMap;
};
