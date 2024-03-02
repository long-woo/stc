# STC

![logo](resources/stc.svg)

STC (Swagger Transform Code) is a tool for converting Swagger documents into code files.

STC(Swagger Transform Code) 是一个 Swagger 文档转换成代码文件的工具。

![Publish to release](https://github.com/long-woo/stc/actions/workflows/deno-build.yml/badge.svg)
[![Publish Package to npmjs](https://github.com/long-woo/stc/actions/workflows/npm.yml/badge.svg)](https://github.com/long-woo/stc/actions/workflows/npm.yml)

feature:
特性：

- Support for Swagger 2, 3 and Apifox.

  支持 Swagger 2、3 和 Apifox。

- Support Axios, Wechat request library。

  支持 Axios、Wechat 请求库。

- Support plug-in development.

  支持插件开发。

- Built-in transformation languages:

  内置转换语言：

  - TypeScript, almost equivalent to handwriting.

    TypeScript，几乎等同于手写。

  - JavaScript, from TypeScript to it.

    JavaScript，由 TypeScript 转换而来。

  - ...

## Quick start 快速开始

[download](https://github.com/long-woo/stc/releases) by system：

按系统[下载](https://github.com/long-woo/stc/releases)：

- stc: Intel-based Mac

  stc：Intel 系列的 Mac

- stc-m: M-series Mac

  stc-m：M 系列的 Mac

- stc-linux：Linux
- stc-win.exe: Windows

### Use 使用

⚠️ Note: deno will not parse the `~` character as the user's home directory.

注意：deno 不会解析 `~`字符为用户主目录。

```sh
stc --url=https://petstore3.swagger.io/api/v3/openapi.json --outDir=out
```

![终端输出信息](resources/output.png)

![输出文件](resources/file.png)

### 已有项目

#### axios

1.找到 `outDir` 的目录，复制 `shared > webClientBase` 文件到该目录。

2.打开 `shared > axios > fetch` 文件，复制 `request` 方法，添加到你封装的 `axios` 模块中。没有封装的话，可以复制整个 `fetch` 文件。

3.以 `Vue` 为例，在 `main.ts` 文件中添加以下代码:

```ts
import webClient from './apis/shared/axios/fetch'

webClient.create({
  baseURL: 'https://api.xxx.com'
  // onError(msg) {
  //   // 处理错误信息
  // }
})
```

#### wechat

1.找到 `outDir` 的目录，复制 `shared > webClientBase` 文件到该目录。

2.打开 `shared > wechat > fetch` 文件，复制 `request` 方法，添加到你封装的 `axios` 模块中。没有封装的话，可以复制整个 `fetch` 文件。

3.在 `app.ts` 文件中添加以下代码:

```ts
import webClient from './apis/shared/wechat/fetch';
// import Notify from './miniprogram_npm/@vant/weapp/notify/notify';

App<IAppOption>({
  onLaunch() {
    webClient.create({
      baseURL: 'https://api.xxx.com,
      onError(msg) {
        // Notify({ type: 'danger', message: msg, selector: '#v-notify'})
      }
    })
  }
});
```

### Options 选项

| 参数名   | 类型     | 默认值  | 说明                                                                                                       |
| -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| url      | string   |         | Swagger 文档地址，或者本地路径                                                                             |
| outDir   | string   | stc_out | 输出目录                                                                                                   |
| platform | string   | axios   | 平台，可选值：`axios`、`wechat`                                                                            |
| lang     | string   | ts      | 语言，用于输出文件的后缀名                                                                                 |
| tag      | number   |         | 从接口 url 指定标签，默认读取 tags 的第一个用于文件名                                                      |
| filter   | string[] |         | 过滤接口，符合过滤条件的接口会被生成。eg: `--filter "/pet/*"`，生成 `/pet` 的接口，同时支持多个 `--filter` |

## Plug-in development 插件开发

For convenience, STC can not only develop plugins in Deno, but also provides `@loongwoo/stc` npm library, which can develop plugins in Node environment.

为了方便，STC 不仅可以在 Deno 中开发插件，同时也提供了 `@loongwoo/stc` npm 库，可以在 Node 环境中开发插件。

[查看示例代码](https://github.com/long-woo/stc/tree/master/examples)

### Deno 方式

⚠️ 准备 [Deno](https://github.com/denoland/deno#install) 环境

创建一个 `myPlugin.ts` 文件：

```ts
// 引用模块
import { start } from 'https://deno.land/x/stc@1.4.1/mod.ts'

// 定义插件
const myPlugin: IPlugin = {
  name: 'stc:MyPlugin',
  lang: 'ts',
  setup(options) {
    console.log(options)
  },
  onTransform(def, action) {
    // 转换 definition
    const defContent: string = parserDefinition(
      def /* 这里的 def 是 Definition 对象 */
    )
    // 转换 action
    const actionContent: Map<string, string> = parserAction(
      action /* 这里的 action 是 Action 对象 */
    )
    // 返回转换后的内容
    return {
      definition: defContent,
      action: actionContent // 这里的 actionContent 是 Map<string, string> 类型，key 是文件名称，value 是转换后的代码
    }
  }
}

// 使用插件
start({
  // ...其他配置
  plugins: [myPlugin]
})
```

### Node 方式

1.创建一个 `myPlugin.ts` 文件。

2.添加 `@loongwoo/stc` 引用，使用 `start` 方法：

```ts
import { start } from '@loongwoo/stc'
```

3.在插件的 `onTransform` 钩子函数中实现将 `definition` 和 `action` 转换为目标语言的代码。

```ts
export const myPlugin: IPlugin = {
  name: 'stc:MyPlugin',
  lang: 'ts',
  setup(options) {
    console.log(options)
  },
  onTransform(def, action) {
    // 转换 definition
    const defContent: string = parserDefinition(
      def /* 这里的 def 是 Definition 对象 */
    )
    // 转换 action
    const actionContent: Map<string, string> = parserAction(
      action /* 这里的 action 是 Action 对象 */
    )
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
