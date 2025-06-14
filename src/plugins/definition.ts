import type { IDefinitionVirtualProperty } from "../swagger.ts";
import type { IPluginOptions } from "./typeDeclaration.ts";
import Logs from "../console.ts";
import { convertType, renderEtaString } from "./common.ts";
import { getT } from "../i18n/index.ts";
import { convertValue } from "../utils.ts";

const parserBaseAndEnum = (
  name: string,
  props: IDefinitionVirtualProperty,
  options: IPluginOptions,
) => {
  const _enumOption = props.enumOption;
  const isEnum = (_enumOption?.length ?? 0) > 0;
  const data = isEnum
    ? _enumOption
    : convertType(props.type, props.ref, props.additionalRef, options);

  const res = renderEtaString(
    options.template!.enum,
    { name, data, convertValue, isEnum },
  );

  return res;
};

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty | IDefinitionVirtualProperty[]>,
  options: IPluginOptions,
) => {
  const _definitions: string[] = [];
  Logs.info(`${getT("$t(plugin.parserDef)")}...`);

  data.forEach((props, key) => {
    const _definition: string[] = [];

    // 基础类型、枚举处理
    if (!Array.isArray(props)) {
      const _data = parserBaseAndEnum(
        key,
        props as IDefinitionVirtualProperty,
        options,
      );

      _definitions.push(_data);
      return;
    }

    props.forEach((prop, index) => {
      const _type = convertType(
        prop.type,
        prop.ref,
        prop.additionalRef,
        options,
      );
      const _enumOption = prop.enumOption;

      // 添加枚举定义
      if (_enumOption?.length) {
        const _enumData = parserBaseAndEnum(_type, prop, options);

        _definition.unshift(`${_enumData}`);
      }

      // 定义头
      if (index === 0) {
        _definition.push(
          renderEtaString(options.template!.definitionHeader, { defName: key }),
        );
      }

      // 定义属性
      _definition.push(
        renderEtaString(options.template!.definitionBody, {
          propCommit: prop.title || prop.description,
          prop: prop,
          propType: _type,
          nullable: prop.nullable
            ? convertType("null", undefined, undefined, options)
            : "",
        }),
      );

      // 定义尾
      if (index === props.length - 1) {
        _definition.push(
          renderEtaString(options.template!.definitionFooter, {
            defName: key,
            props,
          }),
        );
      }
    });

    _definitions.push(_definition.join("\n"));
  });

  Logs.info(getT("$t(plugin.parserDefDone)"));
  return _definitions.join("\n");
};
