import type { IDefinitionVirtualProperty } from "../../swagger.ts";
import Logs from "../../console.ts";
import { convertValue, parseEta } from "../../util.ts";
import { getT } from "../../i18n/index.ts";

const convertType = (type: string | string[], ref?: string) => {
  // 当只有 ref 或者 type 为 object 时，直接返回 ref
  if ((!type || type === "object") && ref) return ref;

  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type || "dynamic";

  const _action: Record<string, string> = {
    string: "String",
    integer: "int",
    boolean: "bool",
    array: `List<${ref && convertType(ref) || "dynamic"}>`,
    object: "Map<string, dynamic>",
    file: "File",
    null: "null",
  };

  const _newType = Array.isArray(type) ? type : [type];
  const _type = _newType
    .map((item) => _action[item] || item)
    .filter((item) => item)
    .join(" | ");

  return _type;
};

/**
 * Converts an enum to a union type.
 *
 * @param {string} type - the name of the union type
 * @param {Array<string>} data - the array of enum values
 * @return {string} the union type definition
 */
const parserEnum = (
  type: string,
  data?: Array<string>,
) => {
  if (!data?.length) return "";

  const _unionValue = data?.map(convertValue).join(",\n\t");

  return `enum ${type} {
  ${_unionValue}
}`;
};

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
<% const _type = it.convertType(prop.type, prop.ref), _enumData = it.parserEnum(_type, prop.enumOption) %>
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
