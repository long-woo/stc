import micromatch from "npm:micromatch@4.0.8";

import Logs from "./console.ts";
import type {
  IDefaultObject,
  IDefinitionNameMapping,
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  IPathVirtualProperty,
  ISwaggerContent,
  ISwaggerOptions,
  ISwaggerResultDefinition,
  ISwaggerResultPath,
} from "./swagger.ts";
import {
  camelCase,
  getObjectKeyByValue,
  getRefType,
  hasKey,
  lowerCase,
  upperCase,
} from "./common.ts";
import { getT } from "./i18n/index.ts";

// #region 处理定义数据
/**
 * 获取定义
 * @param key - 定义的名称
 * @param isDefinition - 是否为定义
 * @returns
 */
const getDefinitionNameMapping = (
  key: string,
  isDefinition?: boolean,
): IDefinitionNameMapping => {
  const genericKey = ["T", "K", "U"];
  const keyLength = genericKey.length;

  const name = getRefType(key);
  let mappings: Record<string, string> = {};

  // 处理泛型
  const newName = name.replace(/«(.*)?»/g, (_key: string, _value: string) => {
    const def = getDefinitionNameMapping(_value, isDefinition);

    // 定义的情况下，需要将具体名称换成 T、K、U...
    if (isDefinition) {
      mappings = def.mappings ?? {};

      const arr = def.name.split(/,\s*/g).map((_n: string, index: number) => {
        let newKey = genericKey[index % keyLength];
        // 当超过预设泛型 key 长度，自动加数字
        if (index >= keyLength) {
          newKey = newKey + Math.ceil((index - keyLength) / keyLength);
        }

        if (!mappings[newKey]) {
          mappings[newKey] = _n;
        }

        return newKey;
      });

      return `<${arr.join(", ")}>`;
    }

    return `<${def.name}>`;
  });

  return {
    name: newName,
    mappings,
  };
};

/**
 * 原始定义对象转换为虚拟定义对象
 *
 * @param defItem - 定义名的属性
 * @param defMapping - 定义
 * @returns
 */
const getVirtualProperties = (
  defItem: ISwaggerResultDefinition,
  defMapping: IDefinitionNameMapping,
  defData: Map<
    string,
    IDefinitionVirtualProperty[] | IDefinitionVirtualProperty
  >,
): IDefinitionVirtualProperty[] => {
  if (!defItem.type.includes("object")) {
    Logs.error(getT("$t(def.parserTypeError)", { type: defItem.type }));
    return [];
  }

  const props = defItem.properties ?? {};
  const mappings = defMapping.mappings ?? {};

  const vProps = Object.keys(props).reduce(
    (prev: IDefinitionVirtualProperty[], current) => {
      const prop = props[current];

      // 必填属性
      const required = defItem.required?.includes(current) ?? false;
      // 属性枚举选项值
      const enumOption = prop.enum || [];
      // 属性 ref
      let refName = getDefinitionNameMapping(prop.$ref ?? "").name;
      if (prop.items) {
        refName = getDefinitionNameMapping(prop.items.$ref ?? "").name ||
          (prop.items.type ??
            "");
      }

      // 属性类型。若存在枚举选项，则需要声明一个“定义名 + 属性名”的枚举类型
      const type = enumOption.length
        ? camelCase(`${defMapping.name}_${current}`, true)
        : (getObjectKeyByValue(mappings, refName) || prop.type);

      const _defItem: IDefinitionVirtualProperty = {
        name: camelCase(current),
        type,
        description: prop.description ?? "",
        required,
        enumOption,
        ref: refName,
        format: prop.format ?? "",
      };

      // 处理当前属性的子属性
      if (hasKey(prop as unknown as Record<string, unknown>, "properties")) {
        const _childDef = getDefinitionNameMapping(current, true);
        const _childProps = getVirtualProperties(
          prop as ISwaggerResultDefinition,
          _childDef,
          defData,
        );

        // 将 type 中存在 object，替换为新名字
        if (_defItem.type.includes("object") && _childProps.length) {
          const _objTypeName = defMapping.name + _childDef.name;

          if (Array.isArray(_defItem.type)) {
            const _objIndex = _defItem.type.indexOf("object");

            _defItem.type.splice(_objIndex, 1, _objTypeName);
          } else {
            _defItem.type = _objTypeName;
          }

          defData.set(_objTypeName, _childProps);
        }
      }

      prev.push(_defItem);
      return prev;
    },
    [],
  );

  return vProps;
};

/**
 * 生成定义对象
 * @param definitions - 定义对象
 * @returns
 */
export const getDefinition = (
  definitions: IDefaultObject<ISwaggerResultDefinition>,
): Map<string, IDefinitionVirtualProperty[] | IDefinitionVirtualProperty> => {
  const defMap = new Map<
    string,
    IDefinitionVirtualProperty[] | IDefinitionVirtualProperty
  >();

  Object.keys(definitions).forEach((key) => {
    const def = getDefinitionNameMapping(key, true);
    const name = def.name;

    // 存在相同定义时，直接跳过
    const defKeys: string[] = [];
    defMap.forEach((_, key) => {
      defKeys.push(key.replace(/<.*>$/, ""));
    });
    if (defKeys.includes(name)) return;

    const defItem = definitions[key];
    let props: IDefinitionVirtualProperty | IDefinitionVirtualProperty[] = [];

    // 处理枚举
    if (defItem.enum) {
      props = {
        type: defItem.type,
        enumOption: defItem.enum,
      } as IDefinitionVirtualProperty;
    } else {
      props = getVirtualProperties(defItem, def, defMap);
    }

    defMap.set(name, props);
  });

  return defMap;
};
// #endregion

// #region 处理所有的 url 数据
/**
 * 从 URL 获取方法名称
 * @param url - 接口地址
 * @param conjunction  - 连接字符
 * @returns
 */
const getMethodName = (url: string, conjunction: string) => {
  const _url = url.split("/");
  // 获取URL路径Query方法名称（取第一个Params）
  let _query = url.split("?")?.[1]?.split("&")
    .shift()?.replace(/[,=]/g, "_");
  // 添加_分割标记
  _query = _query ? `_${_query}` : "";
  let _name = _url.pop()?.split("?")[0] as string;

  if (!_name) return _name;

  const regExp = /^{(\w+)}$/;
  if (regExp.test(_name)) {
    // 动态路径添加连接字符
    _name = `${_url.pop()}_${conjunction}_${_name.match(regExp)![1]}`;
  }

  // 方法名小驼峰
  return camelCase(_name);
};

/**
 * Apifox 属性（type 为 object 时，处理存在的属性定义）
 * @param properties - 属性
 * @param requiredProps - 必填属性
 * @returns
 */
const getProperties = (
  properties: IDefaultObject<IDefinitionVirtualProperty>,
  requiredProps: string[],
) => {
  const _properties = Object.keys(properties ?? {})
    .reduce((prev: IDefinitionVirtualProperty[], current) => {
      const _props = properties[current];
      const _propItem: IDefinitionVirtualProperty = {
        name: current,
        type: _props?.type ?? "",
        typeX: _props.items?.type.toString(),
        required: requiredProps.includes(current) ??
          false,
        title: _props?.title,
        description: _props?.description ?? "",
        // ref: getRefType(
        //   _props?.$ref ?? _props?.items?.$ref ?? "",
        // ),
      };

      // 处理 properties
      if (hasKey(_props as unknown as Record<string, unknown>, "properties")) {
        _propItem.properties = getProperties(
          (_props.properties) as unknown as IDefaultObject<
            IDefinitionVirtualProperty
          >,
          (_props?.required ?? []) as unknown as string[],
        );
      }

      // 处理 items
      if (hasKey(_props as unknown as Record<string, unknown>, "items")) {
        // 检查 items 是否为 object
        if (
          hasKey(
            _props.items as unknown as Record<string, unknown>,
            "properties",
          )
        ) {
          _propItem.properties = getProperties(
            (_props.items?.properties) as unknown as IDefaultObject<
              IDefinitionVirtualProperty
            >,
            (_props.items?.required ?? []) as unknown as string[],
          );
        }
      }

      prev.push(_propItem);
      return prev;
    }, []);

  return _properties;
};

/**
 * 获取请求对象
 * @param url - 接口地址
 * @param method - 请求方式
 * @param pathMethod - 请求对象
 * @param tagIndex - 从 url 指定标签
 * @returns
 */
const getPathVirtualProperty = (
  url: string,
  method: string,
  pathMethod: ISwaggerResultPath,
  tagIndex?: number,
): IPathVirtualProperty => {
  // 请求参数 path、query、body、formData、header
  const parameters =
    (pathMethod.parameters?.sort((_a, _b) =>
      Number(_b.required) - Number(_a.required)
    ) ?? []).reduce((prev: IPathVirtualParameter, current) => {
      const _schema = current.schema;
      const item: IDefinitionVirtualProperty = {
        name: current.name,
        type: current.type ?? _schema?.type ?? "",
        required: current.required,
        description: current.description,
        format: current.format ?? _schema?.format,
        ref: getRefType(
          _schema?.$ref ?? _schema?.items?.$ref ?? "",
        ),
        typeX: current?.items?.type ?? _schema?.items?.type,
        default: _schema?.default,
        enumOption: _schema?.enum,
      };

      prev[current.in].push(item);

      return prev;
    }, { path: [], query: [], body: [], formData: [], header: [] });

  // v3 body 参数在 requestBody
  const _requestBody = pathMethod.requestBody;
  if (_requestBody) {
    Object.keys(_requestBody.content).forEach((_key) => {
      const _bodyContent = _requestBody.content[_key as keyof ISwaggerContent];
      const _bodyContentSchema = _bodyContent?.schema;
      const _bodyContentRef = getRefType(
        _bodyContentSchema?.$ref ?? _bodyContentSchema?.items?.$ref ?? "",
      );
      const _name = (_key === "application/octet-stream"
        ? "file"
        : lowerCase(_bodyContentRef)) || "body";

      // 处理 type 为 object 的情况，并且有 properties 属性
      if (
        _bodyContentSchema?.type === "object" &&
        !Object.keys(_bodyContentSchema?.properties ?? {}).length
      ) {
        return;
      }

      const _properties = getProperties(
        _bodyContentSchema?.properties ?? {},
        _bodyContentSchema?.required ?? [],
      );

      const _body: IDefinitionVirtualProperty = {
        name: _name,
        type: _bodyContentSchema?.type ?? "",
        required: _requestBody.required ?? true,
        description: _requestBody.description,
        ref: _bodyContentRef,
        properties: _properties,
      };

      // body 存在相同 name 时，无需重复添加
      if (
        !parameters.body.some((item) =>
          item.name === _name
        )
      ) {
        parameters.body.push(_body);
      }
    });
  }

  // 响应
  const _resSchema = pathMethod.responses[200]?.schema ??
    pathMethod.responses[200]?.content?.["application/json"]?.schema;

  const _properties = getProperties(
    _resSchema?.properties ?? _resSchema?.items?.properties ?? {},
    _resSchema?.required ?? [],
  );

  // 标签，用于文件名
  let _tag = pathMethod.tags?.[0];
  if (tagIndex !== undefined) {
    _tag = url.split("/")[tagIndex];
  }

  const value: IPathVirtualProperty = {
    url,
    method,
    parameters,
    requestHeaders: pathMethod.consumes,
    responseHeaders: pathMethod.produces,
    response: {
      ref: getRefType(_resSchema?.$ref ?? _resSchema?.items?.$ref ?? ""),
      type: _resSchema?.type,
      properties: _properties,
    },
    summary: pathMethod.summary,
    description: pathMethod.description,
    tag: _tag,
  };

  return value;
};

/**
 * 获取接口地址对象
 * @param paths - 接口地址
 * @returns
 */
export const getApiPath = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>,
  options?: ISwaggerOptions,
): Map<string, IPathVirtualProperty> => {
  const pathMap = new Map<string, IPathVirtualProperty>();

  Object.keys(paths).forEach((url) => {
    // 过滤接口，符合过滤条件的接口会被生成
    if (
      options?.filter?.length && !micromatch.all(url, options.filter, {
        bash: true,
      })
    ) return;

    // 请求方式
    const methods = paths[url];

    Object.keys(methods).forEach((method) => {
      // url去除 `?` 之后的字符
      if (url.includes("?")) url = url.slice(0, url.indexOf("?"));

      const currentMethod = methods[method];
      // 方法名
      let name = currentMethod.operationId ??
        getMethodName(url, options!.conjunction!);
      if (!name) {
        Logs.error(getT("$t(path.notName)", { url, method }));
        return;
      }

      // 添加请求方式标识，如 GET，POST 等，防止重名。设置了 operationId，以 operationId 为准
      if (
        !currentMethod.operationId &&
        !/^(get|post|put|delete|options|head|patch)/i.test(
          name.slice(0, method.length),
        )
      ) {
        name = `${method}${upperCase(name)}`;
      }

      // 接口对象
      const value = getPathVirtualProperty(
        url,
        method,
        currentMethod,
        options?.tag,
      );

      pathMap.set(name, value);
    });
  });

  return pathMap;
};
// #endregion
