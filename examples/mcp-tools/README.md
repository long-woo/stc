# OpenAPI to MCP Tools

这个示例把一个偏真实的任务工作台 API 转换成 MCP 工具清单。生成结果 `generated/mcp-tools.json` 的结构可以直接用于 MCP `tools/list` 响应。

在仓库根目录执行：

```bash
cd examples/mcp-tools
deno run -A --config ../../deno.json ../../src/main.ts --config ./stc.config.json
```

也可以不使用配置文件，直接执行：

```bash
stc --mcp --url=./openapi.yaml --outDir=./generated
```

生成后可以查看：

```bash
cat generated/mcp-tools.json
```

每个工具包含标准字段 `name`、`description` 和 `inputSchema`，并带有 `x-stc-http` 扩展保存真实请求的 HTTP 方法和路径。例如调用 `updateTask` 时，输入参数会按 schema 使用 `taskId` 和 `body`，执行器可以据此请求 `PATCH /tasks/{taskId}`。

这个输出是工具发现层，不包含鉴权和 HTTP 执行器。接入 MCP Server 时，服务端可以读取该文件返回 `tools/list`，再用 `x-stc-http` 将 `tools/call` 参数映射到实际后端。

配置文件也可以使用 `"mcp": true`。
