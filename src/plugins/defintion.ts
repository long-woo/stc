import type { IDefinitionVirtualProperty } from "../swagger.ts";
import type { IPluginOptions } from "../plugins/typeDeclaration.ts";
import Logs from "../console.ts";
import { parseEta } from "../common.ts";
import { convertType, parserEnum } from "./common.ts";
import { getT } from "../i18n/index.ts";

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty[]>,
  options: IPluginOptions,
) => {
  const _res: Array<string> = [];

  Logs.info(`${getT("$t(plugin.parserDef)")}...`);
  data.forEach((props, key) => {
    props.forEach((prop) => {
      const _type = convertType(
        prop.type,
        prop.ref,
        options,
      );
      const _enumOption = prop.enumOption;
      const _enumData = parserEnum(_type, _enumOption);

      // 添加枚举定义
      if (_enumOption?.length) {
        _res.push(_enumData);
      }
    });

    const _classContent = parseEta(
      `class <%= it.class %> {
<% it.props.forEach(function(prop) { %>
<% const _type = it.convertType(prop.type, prop.ref, it.pluginOptions) %>
<% if (prop.description) { %>
  /// <%= prop.description %>\n
<% } %>
  <%~ _type %><% if (!prop.required) { %>?<% } %> <%= prop.name %>;
<% }) %>

  <%= it.class %>({
  <% it.props.forEach(function(prop, index) { %>
  <% if (prop.required) { %>required <% } %>this.<%= prop.name %><%= index === (it.props.length - 1) ? '' : ',' %>\n
  <% }) %>
});

  factory <%= it.class %>.fromJson(Map<String, dynamic> json) {
    return <%= it.class %>(
  <% it.props.forEach(function(prop, index) { %>
    <%= prop.name %>: json['<%= prop.name %>']<%= index === it.props.length -1 ? '' : ',' %>\n
  <% }) %>
  );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};

<% it.props.forEach(function(prop) { %>
    data['<%= prop.name %>'] = <%= prop.name %>;
<% }) %>

    return data;
  }
}`,
      { class: key, props, convertType, parserEnum, pluginOptions: options },
    );

    _res.push(_classContent);
  });

  Logs.info(getT("$t(plugin.parserDefDone)"));
  return _res.join("\n\n");
};
