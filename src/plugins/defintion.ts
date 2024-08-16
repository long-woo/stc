import type { IDefinitionVirtualProperty } from "../swagger.ts";
import type { IPluginOptions } from "../plugins/typeDeclaration.ts";
import Logs from "../console.ts";
import { convertType, parserEnum, renderTemplate } from "./common.ts";
import { getT } from "../i18n/index.ts";

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty[]>,
  options: IPluginOptions,
) => {
  const _definitions: string[] = [];

  Logs.info(`${getT("$t(plugin.parserDef)")}...`);
  data.forEach((props, key) => {
    const _definition: string[] = [`// #region ${key}`];

    props.forEach((prop, index) => {
      const _type = convertType(
        prop.type,
        prop.ref,
        options,
      );
      const _enumOption = prop.enumOption;
      const _enumData = parserEnum(_type, _enumOption);

      // 添加枚举定义
      if (_enumOption?.length) {
        _definition.splice(1, 0, `${_enumData}\n`);
      }

      // 定义头
      if (index === 0) {
        _definition.push(renderTemplate("definitionHeader", { defName: key }));
      }

      // 定义属性
      _definition.push(
        renderTemplate("definitionBody", {
          propCommit: prop.title || prop.description,
          prop: prop,
          propType: _type,
        }),
      );

      // 定义尾
      if (index === props.length - 1) {
        _definition.push(
          "",
          renderTemplate("definitionFooter", { defName: key, props }),
          "// #endregion\n",
        );
      }
    });

    _definitions.push(_definition.join("\n"));
  });

  Logs.info(getT("$t(plugin.parserDefDone)"));
  return _definitions.join("\n");
};
