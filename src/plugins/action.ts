import type {
  IApiParseResponse,
  IApiParseResponseRef,
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  IPathVirtualProperty,
  IPathVirtualPropertyResponse,
} from "../swagger.ts";
import type { IPluginOptions } from "./typeDeclaration.ts";
import { camelCase, upperCase } from "../utils.ts";
import { convertType, renderEtaString } from "./common.ts";
import Logs from "../console.ts";
import { getT } from "../i18n/index.ts";
import { convertValue } from "../utils.ts";

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
  /**
   * 内部定义所引用的外部类型
   */
  imports: string[];
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
    _defHeader = renderEtaString(pluginOptions.template!.definitionHeader, {
      defName: name,
    });
    _defFooter = renderEtaString(pluginOptions.template!.definitionFooter, {
      defName: name,
      props: properties,
    });
  }

  // `core.ts` 对数组属性会把 `items.type` 放进 `ref`，这类内置类型不需要导入
  const _builtInTypes = pluginOptions.typeMap?.(convertType, undefined) ?? {};

  const _defs = properties.reduce((prev: IApiInternalDefinition, current) => {
    let _type = convertType(
      current.type,
      current.typeX ?? current.ref,
      current.additionalRef,
      pluginOptions,
    );

    // 枚举属性，`core.ts` 给出的是 `Body` 前缀的占位类型名，
    // 这里按当前定义名重新命名，并补上枚举定义
    if (current.enumOption?.length) {
      _type = `${name}${upperCase(current.name)}`;

      prev.definitions.unshift(
        renderEtaString(
          pluginOptions.template!.enum,
          { name: _type, data: current.enumOption, convertValue, isEnum: true },
        ),
      );
    }

    if (current.properties?.length) {
      const _defName = `${name}${upperCase(current.name)}`;
      // 内嵌对象使用当前定义名；数组对象同时保留数组容器。
      _type = convertType(
        current.type === "array" ? "array" : "object",
        _defName,
        current.additionalRef,
        pluginOptions,
      );

      const _childDefinition = getInternalDefinition(
        current.properties,
        _defName,
      );

      prev.childDefinitions.push(
        ..._childDefinition.definitions,
        ..._childDefinition.childDefinitions,
      );
      prev.imports.push(..._childDefinition.imports);
    } else if (current.ref && !(current.ref in _builtInTypes)) {
      // 未生成本地定义时，类型来自外部定义，需要导入
      prev.imports.push(current.ref);
    }

    const _defBody = renderEtaString(pluginOptions.template!.definitionBody, {
      propCommit: current.title || current.description,
      propType: _type,
      prop: current,
    });

    prev.definitions.splice(prev.definitions.length - 1, 0, _defBody);
    return prev;
  }, {
    definitions: properties.length ? [_defHeader, _defFooter] : [],
    childDefinitions: [],
    imports: [],
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

  return { definitions: _defs, imports: _def.imports };
};

/**
 * 解析参数
 * @param parameters - 参数
 * @param action - 方法名称
 */
const parseParams = (parameters: IPathVirtualParameter, action: string) => {
  // `core.ts` 会把内置类型（如 file）写进 `ref`，这类类型无需从定义文件导入
  const _builtInTypes = pluginOptions.typeMap?.(convertType, undefined) ?? {};

  return Object.keys(parameters).reduce((prev: IApiParams, current) => {
    const _category = current as keyof IPathVirtualParameter;
    const _params = parameters[_category];
    const _multiParam = _params.length > 1;
    const _defName = camelCase(`${action}_${current}_params`, true);

    // 形参
    let _formalParam = {
      name: current,
      originalName: "",
      category: current,
      type: _defName,
      description: "",
      required: true,
    };

    _params.forEach((item, index) => {
      let _type = `${
        convertType(
          item.type,
          item.typeX ?? item.ref,
          item.additionalRef,
          pluginOptions,
        )
      }`;

      // 枚举与 properties 都会在本文件内生成定义，覆盖掉上面的 `_type`，
      // 此时 `ref` 不会出现在产物里，导入进来就是多余的
      const _hasInternalDefinition = !!(item.enumOption?.length ||
        item.properties?.length);

      // 外部引用
      if (
        item.ref && !_hasInternalDefinition && !(item.ref in _builtInTypes) &&
        !prev.imports?.includes(item.ref)
      ) {
        prev.imports?.push(item.ref);
      }

      /* #region 内部定义 */
      // 定义参数枚举
      if (item.enumOption?.length) {
        _type = camelCase(`${_defName}_${item.name}`, true);

        const _enumData = renderEtaString(
          pluginOptions.template!.enum,
          { name: _type, data: item.enumOption, convertValue, isEnum: true },
        );

        prev.definitions?.unshift(_enumData);
      }

      // properties 存在时直接定义
      if (item.properties?.length) {
        // 多参数时，当前分类还会生成名为 `_defName` 的包装定义，
        // 子定义需另行命名并置于顶层，避免重名、嵌入包装定义内部
        const _childDefName = _multiParam
          ? `${_defName}${upperCase(item.name)}`
          : _defName;
        const _defs = getDefinition(item.properties, _childDefName);

        _type = convertType(
          item.type === "array" ? "array" : "object",
          _childDefName,
          item.additionalRef,
          pluginOptions,
        );

        if (_multiParam) {
          prev.definitions?.unshift(_defs.definitions.join("\n"));
        } else {
          prev.definitions?.push(_defs.definitions.join("\n"));
        }

        _defs.imports.forEach((_import) => {
          if (!prev.imports?.includes(_import)) {
            prev.imports?.push(_import);
          }
        });
      }

      // 同类型的参数进行合并成新对象
      if (_multiParam) {
        if (index === 0) {
          prev.definitions?.push(
            renderEtaString(pluginOptions.template!.definitionHeader, {
              defName: _defName,
            }),
          );
        }

        prev.definitions?.push(
          renderEtaString(pluginOptions.template!.definitionBody, {
            propCommit: item.title || item.description,
            prop: item,
            propType: _type,
          }),
        );

        if (index === _params.length - 1) {
          prev.definitions?.push(
            renderEtaString(pluginOptions.template!.definitionFooter, {
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
          originalName: item.originalName && item.originalName !== item.name
            ? item.originalName
            : "",
          category: current,
          type: _type,
          description: (item.title || item.description) ?? "",
          required: item.required ?? false,
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
};

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
      type: convertType(
        response.type ?? "object",
        _defName,
        undefined,
        pluginOptions,
      ),
      definitions: _definitions.definitions,
      imports: _definitions.imports,
    };
  } else {
    const _defName = parseResponseRef(response.ref ?? "");
    const _defNameType = convertType(
      response.type ?? "",
      _defName.name,
      undefined,
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
  // console.log(_params);
  if (!_response.name) {
    Logs.warn(getT("$t(plugin.no_200_response)"));
  }

  const _apiMethod = renderEtaString(pluginOptions.template!.actionMethod, {
    summary: data.summary,
    description: data.description,
    methodName: action,
    params: [
      ..._params.requiredParams ?? [],
      ..._params.optionalParams ?? [],
    ],
    responseName: _response.name,
    responseType: _response.type,
    action: action,
    url: data.url,
    method: data.method,
    deprecated: data.deprecated,
  });

  return {
    imports: Array.from(
      new Set([..._params.imports ?? [], ..._response.imports ?? []]),
    ),
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
    const _tag = item.tag?.replace(/\s+/g, "");

    if (!_tag) {
      Logs.error(getT("$t(plugin.no_tag)", { url: item.url }));
      return;
    }

    const actionName = key.slice(key.indexOf("@") + 1);
    const _apiData = generateApi(item, actionName);
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
      renderEtaString(pluginOptions.template!.actionImport, {
        importPath: _importPath,
        imports: action.imports,
        typeFileName: defFileName,
      }),
    ];
    const _apiContent: Array<string> = [];

    _apiContent.push(_apiImport.join("\n"));
    action.definitions?.length &&
      _apiContent.push(action.definitions?.join("\n"));
    action.methods?.length && _apiContent.push(action.methods.join("\n"));

    _actionContentMap.set(`${key}.${options.lang}`, _apiContent.join("\n"));
  });

  return _actionContentMap;
};
