# STC Frontend Example

这是一个偏真实的 Vite + TypeScript 前端项目。它模拟一个任务工作台，使用 OpenAPI 作为接口契约，STC 负责生成 API 客户端，应用代码只通过 `src/api/tasks.ts` 调用接口。

项目结构：

```text
config-watch/
├── openapi.yaml              # 后端 API 契约
├── stc.config.json           # STC 配置，输出到 src/api/generated
├── src/
│   ├── api/tasks.ts           # 应用层 API 封装，支持 mock/remote
│   ├── api/generated/         # STC 生成，不提交到 git
│   ├── main.ts                # 页面和交互逻辑
│   └── styles.css             # 页面样式
├── index.html
├── package.json
└── tsconfig.json
```

## 启动前端

需要 Node.js、npm 和 Deno：

```bash
cd examples/config-watch
npm install
npm run dev
```

浏览器打开 Vite 输出的地址，默认会使用本地 mock 数据，因此不需要启动后端。页面支持：

- 任务列表加载
- All / Active / Completed 筛选
- 新增任务
- 完成状态切换
- 删除任务
- 加载、空数据和错误状态

## 验证 STC Watch

另开一个终端，在示例目录执行：

```bash
npm run api:watch
```

此进程会监听 `openapi.yaml`。在 `paths` 下增加一个接口并保存，STC 会重新生成 `src/api/generated`，Vite 会通过 HMR 感知类型和客户端代码变化。

修改 `stc.config.json` 也会触发配置重载。例如修改 `filter` 或其他生成选项，可以观察生成结果如何变化。

## 接入真实后端

设置环境变量后，应用会使用生成的 fetch 客户端：

```bash
VITE_API_MODE=remote \
VITE_API_BASE_URL=http://localhost:3000/api \
npm run dev
```

真实后端需要实现 `openapi.yaml` 中的 `/tasks` 接口。生成的调用位于 `src/api/generated/task.ts`，应用层不需要直接修改生成文件。

## 一次性构建

```bash
npm run build
npm run preview
```
