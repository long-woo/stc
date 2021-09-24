# swagger2code

🔧 Swagger 文档自动生成接口文件。

## 快速开始

⚠️ 由于工具基于 `Deno` 实现，使用前确保已经安装 [Deno](https://github.com/denoland/deno#install) 环境。

### 安装

安装 `swagger2code` 命令，可在终端（命令行）快速使用。

```sh
deno install -n swagger2code --allow-net --allow-read --allow-write --unstable src/mod.ts
```

### 使用

```sh
swagger2code --lang ts --out ./out
```
