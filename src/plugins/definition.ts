import type { IDefinitionVirtualProperty } from "../swagger.ts";
import type { IPluginOptions } from "./typeDeclaration.ts";
import Logs from "../console.ts";
import { convertType, renderEtaString } from "./common.ts";
import { getT } from "../i18n/index.ts";
import { convertValue } from "../common.ts";

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

    // 枚举处理
    if (!Array.isArray(props)) {
      const _enumOption = (props as IDefinitionVirtualProperty).enumOption;

      if (_enumOption?.length) {
        const _enumData = renderEtaString(
          options.template.enum,
          { name: key, data: _enumOption, convertValue },
        );

        _definitions.push(_enumData);
      }
      return;
    }

    props.forEach((prop, index) => {
      const _type = convertType(
        prop.type,
        prop.ref,
        options,
      );
      const _enumOption = prop.enumOption;

      // 添加枚举定义
      if (_enumOption?.length) {
        // if (!options.template.enum) {
        //   const _enumMsg = getT("$t(plugin.template.enumRequired)");

        //   Logs.error(_enumMsg);
        //   throw _enumMsg;
        // }

        const _enumData = renderEtaString(
          options.template.enum,
          { name: _type, data: _enumOption, convertValue },
        );
        _definition.unshift(`${_enumData}`);
      }

      // 定义头
      if (index === 0) {
        _definition.push(
          renderEtaString(options.template.definitionHeader, { defName: key }),
        );
      }

      // 定义属性
      _definition.push(
        renderEtaString(options.template.definitionBody, {
          propCommit: prop.title || prop.description,
          prop: prop,
          propType: _type,
        }),
      );

      // 定义尾
      if (index === props.length - 1) {
        _definition.push(
          renderEtaString(options.template.definitionFooter, {
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
