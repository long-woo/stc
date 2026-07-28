import micromatch from "micromatch";

import Logs from "./console.ts";
import type {
  DefaultConfigOptions,
  IDefaultObject,
  IDefinitionNameMapping,
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  IPathVirtualProperty,
  ISwaggerContent,
  ISwaggerResultDefinition,
  ISwaggerResultPath,
  ISwaggerSchema,
} from "./swagger.ts";
import {
  camelCase,
  getObjectKeyByValue,
  getRefType,
  lowerCase,
  upperCase,
} from "./utils.ts";
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
const getVirtualPropertiesFromSchema = (
  schema: ISwaggerSchema | undefined,
  defs: IDefaultObject<ISwaggerResultDefinition>,
  defMapping: IDefinitionNameMapping,
  defData?: Map<
    string,
    IDefinitionVirtualProperty[] | IDefinitionVirtualProperty
  >,
  requiredProps: string[] = [],
  visitedRefs: Set<string> = new Set(),
): IDefinitionVirtualProperty[] => {
  if (!schema) return [];

  const hasObjectShape =
    !!schema.properties && Object.keys(schema.properties).length > 0 ||
    !!schema.allOf?.length || schema.type?.includes("object") ||
    schema.type === "array";

  if (!hasObjectShape && !schema.$ref) {
    return [];
  }

  const mappings = defMapping.mappings ?? {};
  const mergedProps = new Map<string, IDefinitionVirtualProperty>();
  const required = new Set(requiredProps);

  const collectProps = (currentSchema: ISwaggerSchema | undefined) => {
    if (!currentSchema) return;

    if (currentSchema.$ref) {
      const refName = getRefType(currentSchema.$ref);
      if (visitedRefs.has(refName)) return;

      visitedRefs.add(refName);
      const refSchema = defs[refName];
      if (refSchema) {
        collectProps(refSchema as unknown as ISwaggerSchema);
      }
      visitedRefs.delete(refName);
      return;
    }

    (currentSchema.required ?? []).forEach((item) => required.add(item));

    Object.keys(currentSchema.properties ?? {}).forEach((current) => {
      const prop = currentSchema.properties
        ?.[current] as unknown as ISwaggerSchema;
      const propName = current;
      const propRequired = required.has(propName);

      const enumOption = prop.enum || [];
      let refName = getDefinitionNameMapping(prop.$ref ?? "").name;
      if (prop.items) {
        refName = getDefinitionNameMapping(prop.items.$ref ?? "").name ||
          (prop.items.type ?? "");
      }

      let type = enumOption.length
        ? camelCase(`${defMapping.name}_${propName}`, true)
        : (getObjectKeyByValue(mappings, refName) || prop.type);

      if (
        !type && defs[refName] && !defs[refName].type.includes("object") &&
        !defs[refName].enum?.length
      ) {
        type = defs[refName].type;
        refName = "";
      }

      const additionalRef = typeof prop.additionalProperties === "object" &&
          "$ref" in prop.additionalProperties
        ? getDefinitionNameMapping(prop.additionalProperties.$ref ?? "").name
        : undefined;

      const childDef = getDefinitionNameMapping(propName, true);
      const childSchema = prop as ISwaggerSchema;
      const childProps = getVirtualPropertiesFromSchema(
        childSchema,
        defs,
        childDef,
        defData,
        [],
        visitedRefs,
      );

      const _defItem: IDefinitionVirtualProperty = {
        name: camelCase(propName),
        originalName: propName,
        type: type || "",
        description: prop.description ?? "",
        required: propRequired,
        enumOption,
        ref: refName,
        format: prop.format ?? "",
        nullable: prop.nullable,
        additionalRef,
      };

      if (childProps.length) {
        const _objTypeName = defMapping.name + childDef.name;

        if (
          childSchema.type?.includes("object") || childSchema.properties ||
          childSchema.allOf?.length || childSchema.$ref
        ) {
          if (Array.isArray(_defItem.type)) {
            const _objIndex = _defItem.type.indexOf("object");
            _defItem.type.splice(_objIndex, 1, _objTypeName);
          } else {
            _defItem.type = _objTypeName;
          }

          _defItem.properties = childProps;
          if (defData) {
            defData.set(_objTypeName, childProps);
          }
        }
      }

      mergedProps.set(propName, _defItem);
    });

    currentSchema.allOf?.forEach((item) => collectProps(item));
  };

  collectProps(schema);

  return Array.from(mergedProps.values()).map((item) => ({
    ...item,
    required: required.has(item.originalName ?? item.name),
  }));
};

const getVirtualProperties = (
  defItem: ISwaggerResultDefinition,
  defMapping: IDefinitionNameMapping,
  defs: IDefaultObject<ISwaggerResultDefinition>,
  defData: Map<
    string,
    IDefinitionVirtualProperty[] | IDefinitionVirtualProperty
  >,
): IDefinitionVirtualProperty[] => {
  const hasObjectShape =
    !!defItem.properties && Object.keys(defItem.properties).length > 0 ||
    !!defItem.allOf?.length ||
    defItem.type?.includes("object");

  if (!hasObjectShape) {
    Logs.warn(
      getT("$t(def.parserTypeError)", {
        name: defMapping.name,
        type: defItem.type,
      }),
    );
    return [];
  }

  return getVirtualPropertiesFromSchema(
    defItem as unknown as ISwaggerSchema,
    defs,
    defMapping,
    defData,
    defItem.required ?? [],
  );
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

    if (defItem.enum?.length) {
      props = {
        type: defItem.type,
        enumOption: defItem.enum,
      } as IDefinitionVirtualProperty;
    } else {
      props = getVirtualProperties(defItem, def, definitions, defMap);
    }

    if (def.name === "MetaVariableDataTypeMapResponse") {
      console.log(props);
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
 * @param index - 下标, 默认 -1
 * @returns
 */
const getMethodName = (
  url: string,
  conjunction: string,
  index: number = -1,
) => {
  let _url = url;
  if (url.indexOf("?") > -1) {
    _url = url.substring(0, url.indexOf("?"));
  }

  const _urls = _url.split("/");
  let _name = _urls.slice(index).join("_");

  if (!_name) return _name;

  const regExp = /[\\{|:](\w+)[\\}]/g;
  const regReplace = /[\\{|:\\}]/g;
  if (regExp.test(_url)) {
    // 取最后一个动态路径
    const _lastName = _url.match(regExp)?.pop()?.replace(regReplace, "");

    // 若 _name 中存在动态路径，判断是否与 _lastName 重复
    if (regExp.test(_name)) {
      const _namePath =
        _name.match(regExp)?.reduce<string[]>((prev, current) => {
          const _n = current.replace(regReplace, "");

          // 移除与 _lastName 重复的
          if (_n !== _lastName) {
            prev.push(_n);
          }
          return prev;
        }, []).join("_") ?? "";

      if (_namePath) {
        _name = `${conjunction}_${_namePath}`;
      } else {
        // 移除动态路径名
        _name = _name.replace(regExp, "");
      }
    }

    // 动态路径添加连接字符
    _name = `${_name}_${conjunction}_${_lastName}`;
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
  schema: ISwaggerSchema | undefined,
  requiredProps: string[] = [],
  definitions?: IDefaultObject<ISwaggerResultDefinition>,
) => {
  const defMapping = getDefinitionNameMapping("Body", true);

  return getVirtualPropertiesFromSchema(
    schema,
    definitions ?? {},
    defMapping,
    undefined,
    requiredProps,
  );
};

/**
 * 获取请求对象
 * @param url - 接口地址
 * @param method - 请求方式
 * @param pathMethod - 请求对象
 * @param options - 配置项
 * @returns
 */
const getPathVirtualProperty = (
  url: string,
  method: string,
  pathMethod: ISwaggerResultPath,
  options?: DefaultConfigOptions,
  definitions?: IDefaultObject<ISwaggerResultDefinition>,
): IPathVirtualProperty => {
  // 请求参数 path、query、body、formData、header
  const parameters =
    (pathMethod.parameters?.sort((_a, _b) =>
      Number(_b.required) - Number(_a.required)
    ) ?? []).reduce((prev: IPathVirtualParameter, current) => {
      if (
        (current.in === "header" &&
          !options?.globalHeader?.includes(current.name.toLowerCase())) ||
        current.in !== "header"
      ) {
        const _schema = current.schema;
        const item: IDefinitionVirtualProperty = {
          name: camelCase(current.name),
          originalName: current.name,
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

        const _schemaProperties = getProperties(
          _schema as ISwaggerSchema | undefined,
          _schema?.required ?? [],
          definitions,
        );
        if (_schemaProperties.length) {
          item.properties = _schemaProperties;
        }

        prev[current.in].push(item);
      }

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

      // 处理 type 为 object 的情况，并且有 properties 属性
      if (
        _bodyContentSchema?.type === "object" &&
        !Object.keys(_bodyContentSchema?.properties ?? {}).length
      ) return;

      const _name =
        (["application/octet-stream", "multipart/form-data"].includes(_key)
          ? "file"
          : lowerCase(_bodyContentRef)) || "body";

      const _type = _name === "file"
        ? "FormData"
        : _bodyContentSchema?.type ?? "";

      const _properties = getProperties(
        _bodyContentSchema as ISwaggerSchema | undefined,
        _bodyContentSchema?.required ?? [],
        definitions,
      );

      const _body: IDefinitionVirtualProperty = {
        name: _name,
        type: _type,
        required: _requestBody.required ?? true,
        description: _requestBody.description,
        ref: _bodyContentRef,
        properties: _properties,
      };

      // body 存在相同 name 时，无需重复添加
      if (
        !parameters.body.some((item) => item.name === _name)
      ) {
        parameters.body.push(_body);
      }
    });
  }

  // 响应
  const _resSchema = pathMethod.responses[200]?.schema ??
    pathMethod.responses[200]?.content?.["application/json"]?.schema ??
    pathMethod.responses[200]?.content?.["text/plain"]?.schema;

  const _properties = getProperties(
    _resSchema as ISwaggerSchema | undefined,
    _resSchema?.required ?? [],
    definitions,
  );

  // 标签，用于文件名
  let _tag = pathMethod.tags?.[0];
  if (options?.tag) {
    _tag = url.split("/")[options?.tag];
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
    deprecated: pathMethod.deprecated ?? false,
  };

  return value;
};

/**
 * 获取接口地址对象
 * @param paths - 接口地址
 * @param options - 配置项
 * @returns
 */
export const getApiPath = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPath>>,
  options?: DefaultConfigOptions,
  definitions?: IDefaultObject<ISwaggerResultDefinition>,
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
      if (options?.noDeprecated && methods[method].deprecated) return;
      // url去除 `?` 之后的字符
      if (url.includes("?")) url = url.slice(0, url.indexOf("?"));

      const currentAction = methods[method];

      // 方法名
      let name = currentAction.operationId ??
        getMethodName(url, options!.conjunction!, options?.actionIndex);

      if (!name) {
        Logs.error(getT("$t(path.notName)", { url, method }));
        return;
      }

      // 添加请求方式标识，如 GET，POST 等，防止重名。设置了 operationId，以 operationId 为准
      if (!currentAction.operationId) {
        name = name.replace(/^(get|post|put|delete|options|head|patch)/i, "");
        name = `${method}${upperCase(name)}`;
      }

      // 接口对象
      const value = getPathVirtualProperty(
        url,
        method,
        currentAction,
        options,
        definitions,
      );

      name = `${value.tag}@${name}`;

      if (pathMap.has(name)) {
        Logs.error(
          getT("$t(path.duplicate)", {
            url,
            method,
            name: name.slice(name.indexOf("@") + 1),
          }),
        );

        return;
      }

      pathMap.set(name, value);
    });
  });

  return pathMap;
};
// #endregion
