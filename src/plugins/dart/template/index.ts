// this file is auto generated. 
export default {"actionImport":"import '<%= it.importPath%>shared/api_client_base.dart';\nimport 'shared/dio/index.dart';\n<% if (it.imports.length) { %>\nimport '<%= it.importPath %><%= it.typeFileName %>.dart';\n<% } %>","actionMethod":"<% /* API 方法注释 */ %>\n<% if (it.summary) { %>\n/// <%~ it.summary %>\n<% } %>\n<% if (it.summary !== it.description) { %>\n<% if (it.summary && it.description) { %>\n\n///\n<% } %>\n<% if (it.description) { %>\n/// <%~ it.description %>\n<% } %>\n<% } %>\n\n<% if (it.deprecated) { %>\n@deprecated\n<% } %>\n<% /* API 方法 */ %>\nFuture<<%~ it.responseType %>> <%= it.methodName %>(<% it.params.forEach((param, index) => { %>\n<%~ param.type %><% if(!param.required) { %>?<% } %> <%= param.name %><% if (index < it.params.length - 1) { %>, <% } %>\n<% }) %>) async {\n  var _res = await request<<%~ it.responseType %>>(\n    ApiClientConfig(\n      url: '<%= it.url %>',\n      method: '<%= it.method %>'<% if (it.params.length) { %>,\n      params: {\n<% it.params.forEach((param, index) => { %>\n        '<%= param.category %>': <% if (param.category === param.name) { %><%= param.name %><% } else { %>{'<%= param.name %>' : <%= param.name %>}<% } %><% if (index < it.params.length - 1) { %>, <% } %>\n\n<% }) %>\n      }\n<% } %>\n    )<% if (it.responseType.includes('List<')) { %>, (json) => [<%~ it.responseName %>.fromJson(json)]<% } else if (it.responseName) { %>, <%~ it.responseName %>.fromJson<% } %>);\n\n    return _res;\n}\n","definitionBody":"<% if (it.propCommit) { %>\n  /// <%~ it.propCommit %>\n\n<% } %>\n  <%~ it.propType %><% if (!it.prop.required) { %>?<% } %> <%= it.prop.name %>;","definitionFooter":"  <%= it.defName %>({\n<% it.props.forEach((prop, index) => { %>\n    <% if (prop.required) { %>required <% } %>this.<%= prop.name %><% if (index < it.props.length - 1) { %>,<% } %>\n\n<% }) %>\n  });\n\n  factory <%= it.defName %>.fromJson(Map<String, dynamic> json) {\n    return <%= it.defName %>(\n<% it.props.forEach((prop, index) => { %>\n      <%= prop.name %>: json['<%= prop.name %>']<% if (index < it.props.length - 1) { %>,<% } %>\n\n<% }) %>\n    );\n  }\n\n  Map<String, dynamic> toJson() {\n    final Map<String, dynamic> data = <String, dynamic>{};\n\n<% it.props.forEach((prop) => { %>\n    data['<%= prop.name %>'] = <%= prop.name %>;\n<% }) %>\n\n    return data;\n  }\n}\n","definitionHeader":"class <%= it.defName %> {","enum":"enum <%= it.name %> {\n  <%= it.data.map(it.convertValue).join(\",\\n\\t\")%>\n  \n}"}