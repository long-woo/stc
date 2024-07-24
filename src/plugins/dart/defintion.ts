import type { IDefinitionVirtualProperty } from "../../swagger.ts";
import Logs from "../../console.ts";
import { parseEta, parserEnum } from "../../common.ts";
import { getT } from "../../i18n/index.ts";
import { convertType } from "./util.ts";

/**
 * 解析定义
 * @param data - 参数
 */
export const parserDefinition = (
  data: Map<string, IDefinitionVirtualProperty[]>,
) => {
  const _res: Array<string> = [];

  Logs.info(`${getT("$t(plugin.parserDef)")}...`);

  data.forEach((value, key) => {
    const _classContent = parseEta(
      `<% it.props.forEach(function(prop) { %>
<% const _type = it.convertType(prop.type, prop.ref), _enumData = it.parserEnum(_type, prop.enumOption) %>
<% if (_enumData) { %>
<%= _enumData %>\n
<% } %>
<% }) %>

class <%= it.class %> {
<% it.props.forEach(function(prop) { %>
<% const _type = it.convertType(prop.type, prop.ref) %>
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
      { class: key, props: value, convertType, parserEnum },
    );

    _res.push(_classContent);
  });

  Logs.info(getT("$t(plugin.parserDefDone)"));
  return _res.join("\n\n");
};
