// this file is auto generated. 
export default {"actionImport":"import type { ApiClientConfig } from '<%= it.importPath %>shared/apiClientBase'\nimport { fetchRuntime } from '<%= it.importPath %>shared/fetchRuntime'\n<% if (it.imports.length) { %>\nimport type { <%= it.imports.join(', ') %> } from '<%= it.importPath %><%= it.typeFileName %>'\n<% } %>","actionMethod":"<% /* API 方法注释 */ %>\n/**\n<% if (it.deprecated) { %>\n * @deprecated\n *\n<% } %>\n<% if (it.summary) { %>\n * <%~ it.summary %>\n<% } %>\n<% if (it.summary !== it.description) { %>\n<% if (it.description) { %>\n\n * @description <%~ it.description %>\n<% } %>\n<% } %>\n\n *\n<% if (it.params.length) { %>\n<% it.params.forEach(param => { %>\n * @param {<%~ param.type %>} <% if (!param.required) { %>[<% } %><%= param.name %><% if (!param.required) { %>]<% } %> - <%~ param.description || param.type %>\n\n<% }) %>\n<% } %>\n * @param {ApiClientConfig['config']} [config] - ApiClientConfig['config']\n * @returns {Promise<<%~ it.responseType %>>} Promise<<%~ it.responseType %>>\n */\n<% /* API 方法 */ %>\nexport const <%= it.methodName %> = (<% it.params.forEach((param, index) => { %>\n<%= param.name %><% if (!param.required) { %>?<% } %>: <%~ param.type %><% if (index < it.params.length - 1) { %>, <% } %>\n<% }) %><% if (it.params.length) { %>, <% } %>config?: ApiClientConfig['config']): Promise<<%~ it.responseType %>> => fetchRuntime<<%~ it.responseType %>>('<%= it.url %>', '<%= it.method.toUpperCase() %>', <% if (it.params.length) { %>{\n<% it.params.forEach((param, index) => { %>\n  <%= param.category %><% if (param.category === param.name) { %>\n<% } else { %>: <% if (param.category === 'body') { %><%= param.name %><% } else { %>{\n\t\t<%= param.name %>\n\n\t}<% } %>\n<% } %><% if (index < it.params.length - 1) { %>, <% } %>\n\n<% }) %>\n}<% } else { %>undefined<% } %>, config)\n","definitionBody":"<% if (it.propCommit) { %>\n  /**\n   * <%~ it.propCommit %>\n\n   */\n<% } %>\n  <%= it.prop.name %><% if (!it.prop.required) { %>?<% } %>: <%~ it.propType %>;","definitionFooter":"}\n// #endregion\n","definitionHeader":"// #region <%= it.defName %>\n\nexport interface <%= it.defName %> {","enum":"<% \n  const option = it.isEnum ? it.data.map(item => { \n    const val = it.convertValue(item)\n\n    return typeof val === 'number' ? val : `'${val}'`\n  }) : [it.data]\n%>\n// #region <%= it.name %>\n\nexport type <%= it.name %> = <%~ option.join(\" | \") %>;\n// #endregion\n"}