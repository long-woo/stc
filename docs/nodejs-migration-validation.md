# Node.js 迁移实现与验证记录

日期：2026-10-11。目标版本：3.0.0。Node.js 基线：24。

## 实现范围

- 根目录 `package.json` 为唯一版本来源；npm 锁定依赖，TypeScript 输出 ESM 与类型声明。
- Node 文件操作、路径、进程、参数解析、日志和 YAML 解析替代 Deno/JSR 依赖。
- 配置使用 jiti 加载 JSON/JS/TS；禁用模块及磁盘缓存，重载时重新读取导入的配置依赖。
- chokidar 监听文件所在目录，支持原子替换与删除重建；保留防抖、远程轮询及 SIGINT/SIGTERM 清理。
- 插件初始化和文件写入改为显式等待，确保 `start()` 返回时资源与声明已经写完。
- 模板/shared 内容继续嵌入插件资源映射，供 npm 包和 Node CLI 使用。
- 移除 dnt 构建和 Deno shim。Vitest、ESLint、Prettier 与 TypeScript 类型检查替代旧工具链。
- 发布流程在 macOS、Windows 与 Linux 检查 Node/npm 包兼容性，先生成草稿 Release；人工发布 Release 后触发 npm 发布。
- 新版本停止发布 JSR，旧 2.x 发行版保持原状。`deno.json` 暂留为历史配置，不参与新流程。

## 兼容边界

- 最低 Node.js 版本为 24，版本因此规划为 3.0.0；尚未对外发布。
- ESM 为正式产物。Node 24 的同步 `require()` 消费方式通过安装包检查，不提供单独 CJS 构建。
- 配置依赖会在配置重载时重新读取；仅修改被导入的依赖文件不会自动触发配置监听，需要同时保存主配置文件。
- Axios 生成代码类型检查使用与原示例一致的 1.7.9；未将新版 Axios 类型调整混入此次迁移。
- Bun 未作为运行或构建依赖，尚未宣称 Bun 兼容。

## 验证证据

| 检查                | 当前结果                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| 旧 Deno 完整测试    | 49 通过、6 失败；6 项涉及远程输入，测试命令未输出足够底层信息以进一步定因        |
| 生成基线            | 旧版 2.17.1 的五插件 × v2/v3 本地样例，57 个文件；仅剥离生成 banner 比较 SHA-256 |
| Node 完整回归       | 61 项全部通过；包含生成基线比较、Swift 编译、配置依赖重载和原子替换              |
| Node 类型检查与构建 | 已通过，开启 strict、声明输出与 noEmitOnError                                    |
| npm tarball 安装    | 已通过五插件、TS 配置依赖、第三方插件生命周期、ESM/require 导出与声明消费        |
| 其他平台            | 已配置 macOS Intel、Windows x64、Linux x64 CI；尚未运行远端 CI                   |
| 代码质量与示例      | 类型检查、lint、格式检查通过；前端示例构建与自定义插件示例运行通过               |
| npm/GitHub 发布     | 未执行                                                                           |

执行主机原有 Node 22；验证使用临时目录安装的 Node 24.21.0，没有更换系统运行时。远程输入解析的本地 HTTP 测试与文件监听检查需要在允许监听的执行环境运行。受限环境中的 EPERM 不计为功能通过。

`test/migration-baseline.json` 保存旧版生成文件哈希；`test/migration.test.ts` 在新运行时下逐项核对清单与内容。基线由迁移前实际运行产生，不由新实现自动更新。

前端示例原先引用了不存在的 `src/api/tasks.ts`。此次补齐调用生成客户端的接口封装与原文档承诺的本地 mock，使示例能够完成生产构建。

## 后续发行步骤

1. 在 Node 24 下运行 `npm ci`、`npm run check`、`npm run build`、`npm run test:package`。
2. 核实 macOS、Windows、Linux 的远端 CI 结果。
3. 如先发布候选版，将 `package.json` 与锁文件版本更新为 `3.0.0-rc.1`，创建同名 tag；发布草稿 Release 为 prerelease，npm 使用 `next` 标签。
4. 正式发布匹配 `package.json` 的版本 tag/Release。
5. 回退时恢复 npm 默认标签到已验证旧版本，用户通过 npm 安装指定版本。
6. CI 通过后移除历史 Deno 配置，标记完整迁移验收结束。

本记录区分本机已验证、CI 已配置与已经发布。尚未执行的平台和发行检查不能由本机通过替代。
