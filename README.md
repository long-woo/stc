# swagger2code

🔧 Swagger 文档自动生成接口文件。

特性：

- [x] 覆盖 ~95% 已知 Swagger 文档。
- [x] 支持 Swagger 2、3。
- [x] 支持 Axios、Wechat。
- [x] 生成 TypeScript，几乎等同于手写。
- [x] 支持插件开发。

## 快速开始

⚠️ 由于工具基于 `Deno` 实现，使用前确保已经安装 [Deno](https://github.com/denoland/deno#install) 环境。

### 使用

⚠️ 注意：deno 不会解析 `~`字符为用户主目录。

```sh
swagger2code --url=https://petstore3.swagger.io/api/v3/openapi.json --outDir=out
```

![终端输出信息](resources/output.png)

![输出文件](resources/file.png)

### 选项

| 参数名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| url | string |  | Swagger 文档地址 |
| outDir | string | swagger2code_out | 输出目录 |
| platform | string |  | 平台，可选值：`axios`、`wechat` |
| lang | string | ts | 语言，用于输出文件的后缀名 |
