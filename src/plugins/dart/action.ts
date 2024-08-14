import type {
  IApiParseResponse,
  IApiParseResponseRef,
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  IPathVirtualProperty,
  IPathVirtualPropertyResponse,
} from "../../swagger.ts";
import { camelCase, parseEta, parserEnum, upperCase } from "../../common.ts";
import Logs from "../../console.ts";
import { getT } from "../../i18n/index.ts";
import { convertType } from "./util.ts";

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
  imports: Array<string>;
  definitions: Array<string>;
  methods: Array<string>;
}

interface IApiInternalDefinition {
  definitions: Array<string>;
  childDefinitions: Array<string>;
}

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
    _defHeader = parseEta(`class <%= it.defName %> {`, { defName: name });
    _defFooter = parseEta(
      `<%= it.defName %>({
  <% it.props.forEach((prop, index) => { %>
  <% if (prop.required) { %>required <% } %>this.<%= prop.name %><% if (index < it.props.length - 1) { %>,<% } %>
  <% }) %>
  });

  factory <%= it.defName %>.fromJson(Map<String, dynamic> json) {
    return <%= it.defName %>(
    <% it.props.forEach((prop, index) => { %>
      <%= prop.name %>: json['<%= prop.name %>']<% if (index < it.props.length - 1) { %>,<% } %>
    <% }) %>
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};

    <% it.props.forEach((prop) => { %>
    data['<%= prop.name %>'] = <%= prop.name %>;
    <% }) %>

    return data;
  }
}`,
      { defName: name, props: properties },
    );
  }

  const _defs = properties.reduce((prev: IApiInternalDefinition, current) => {
    let _type = convertType(current.type, current.typeX ?? current.ref);

    if (current.properties?.length) {
      const _defName = `${name}${upperCase(current.name)}`;
      _type = convertType(current.type, _defName);

      const _childDefinition = getInternalDefinition(
        current.properties,
        _defName,
      );

      prev.childDefinitions.push(
        ..._childDefinition.definitions,
        ..._childDefinition.childDefinitions,
      );
    }

    const _defBody = parseEta(
      `<% if (it.propCommit) { %>
      /// <%= it.propCommit %>
      <%~ it.propType %><% if (!it.prop.required) { %>?<% } %> <%= it.prop.name %>;
    <% } %>`,
      {
        propCommit: current.title || current.description,
        propType: _type,
        prop: current,
      },
    );

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
    const _params = parameters[current as keyof IPathVirtualParameter];
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
        : `${convertType(item.type, item.typeX ?? item.ref)}`;

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
        const _newParam = parseEta(
          `<% if (it.firstParam) { %>
class <%= it.defName %> {
<% } %>
<% if (it.param.title || it.param.description) { %>
  /// <%= it.param.title || it.param.description %>\n
<% } %>
  <%~ it.paramType %><%= it.param.required ? '' : '?' %> <%= it.param.name %>;
  <% if (it.lastParam) { %>

  <%= it.defName %>({
    <% it.params.forEach((param, index) => { %>
    <% if (param.required) { %>required <% } %>this.<%= param.name %><% if (index < it.params.length - 1) { %>,<% } %>\n
    <% }) %>
  });

  factory <%= it.defName %>.fromJson(Map<String, dynamic> json) {
    return <%= it.defName %>(
      <% it.params.forEach((param, index) => { %>
      <%= param.name %>: json['<%= param.name %>']<% if (index < it.params.length - 1) { %>,<% } %>\n
      <% }) %>
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};

    <% it.params.forEach((param) => { %>
    data['<%= param.name %>'] = <%= param.name %>;
    <% }) %>

    return data;
  }
}
<% }%>
`,
          {
            firstParam: index === 0,
            lastParam: index === _params.length - 1,
            defName: _defName,
            param: item,
            paramType: _type,
            params: _params,
          },
        );

        prev.definitions?.push(_newParam);
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

      // TODO: 多 body 参数名字处理
      // if (current === "body") {
      //   _formalParam.name = item.name;
      // }
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

  if (_response.name === "unknown") {
    Logs.warn(getT("$t(plugin.no_200_response)"));
  }

  const _apiMethod = parseEta(
    `<% /* API 方法注释 */ %>
<% if (it.summary) { %>
/// <%~ it.summary %>
<% } %>
<% if (it.summary && it.description) { %>
\n///
<% } %>
<% if (it.description) { %>
/// <%~ it.description %>
<% } %>

Future<<%~ it.responseType %>> <%= it.methodName %>(<% it.params.forEach((param, index) => { %>
<%~ param.type %><%= param.required ? '?' : '' %> <%= param.name %><% if (index < it.params.length - 1) { %>, <% } %>
<% }) %>) async {
  var _res = await request<<%~ it.responseType %>>(
    ApiClientConfig(
      url: '<%= it.url %>',
      method: '<%= it.method %>',
      params: {
        <% it.params.forEach((param, index) => { %>
        '<%= param.category %>': <%= param.name %><% if (index < it.params.length - 1) { %>,<% } %>\n
        <% }) %>
      }
    )<% if (it.responseName) { %>, <%~ it.responseName %>.fromJson<% } %>);

    return _res;
}`,
    {
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
    },
  );

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
 * 解析接口
 * @param data - 接口信息
 */
export const parserActions = (data: Map<string, IPathVirtualProperty>) => {
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
      if (_api.imports) {
        const _imports = Array.from(
          new Set([..._apiMap.imports, ..._api.imports]),
        );

        _apiMap.imports = _imports;
      }
      _api.definition && _apiMap?.definitions?.push(_api.definition);
      _apiMap?.methods?.push(_api.method);
    } else {
      apiMap.set(_tag, {
        imports: _api.imports,
        definitions: _api.definition ? [_api.definition] : [],
        methods: [_api.method],
      });
    }
  });

  Logs.info(getT("$t(plugin.parserActionDone)"));
  return apiMap;
};
