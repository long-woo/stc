# STC

STC(Swagger Transform Code) 是一个 Swagger 文档转换成代码文件的工具。

![Publish](https://github.com/long-woo/stc/actions/workflows/deno-build.yml/badge.svg)

特性：

- [x] 支持 Swagger 2、3。
- [x] 支持 Axios、Wechat。
- [x] 支持插件开发。
- [x] 内置转换语言：

  - TypeScript，几乎等同于手写。

## 快速开始

⚠️ 由于工具基于 `Deno` 实现，使用前确保已经安装 [Deno](https://github.com/denoland/deno#install) 环境。

### 使用

⚠️ 注意：deno 不会解析 `~`字符为用户主目录。

```sh
stc --url=https://petstore3.swagger.io/api/v3/openapi.json --outDir=out
```

![终端输出信息](resources/output.png)

![输出文件](resources/file.png)

### 选项

| 参数名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| url | string |  | Swagger 文档地址，或者本地路径 |
| outDir | string | stc_out | 输出目录 |
| platform | string |  | 平台，可选值：`axios`、`wechat` |
| lang | string | ts | 语言，用于输出文件的后缀名 |

## 插件开发

1.创建一个 `myPlugin.ts` 文件。

2.添加 `@loongwoo/stc` 引用，使用 `start` 方法：

```ts
import { start } from '@loongwoo/stc'
```

3.在插件的 `onTransform` 钩子函数中实现将 `definition` 和 `action` 转换为目标语言的代码。

```ts
export const myPlugin: IPlugin = {
  name: "stc:MyPlugin",
  setup(options) {
    console.log(options)
  }
  onTransform(def, action) {
    // 转换 definition
    const defContent: string = parserDefinition(def /* 这里的 def 是 Definition 对象 */)
    // 转换 action
    const actionContent: Map<string, string> = parserAction(action /* 这里的 action 是 Action 对象 */)
    // 返回转换后的内容
    return {
      definition: defContent,
      action: actionContent
    }
  }
}
```

4.在 `start` 方法里，添加 `plugins`:

```ts
start({
  // ...其他配置
  plugins: [myPlugin]
})
```
