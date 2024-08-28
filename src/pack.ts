import { expandGlob } from "@std/fs";
import { createFile, readFile } from "./common.ts";

/**
 * Reads the shared directories of all plugins.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of paths
 * to the shared files of all plugins.
 */
const readdDir = async (dirName: string) => {
  const _files = await Array.fromAsync(
    expandGlob(`src/plugins/*/${dirName}/**/*.*`, {
      exclude: [`**/*/${dirName}/index.ts`],
    }),
  );

  let _fileMap = Object.create({});
  let _newPluginName = null;

  for await (const _file of _files) {
    // 插件名
    const _pluginName = new RegExp(`src/plugins/(.+?)/${dirName}`).exec(
      _file.path,
    )?.[1];
    // 从路径中获取文件名，shard/filename
    let _filename = new RegExp(`/${dirName}/(.+)\\.`).exec(_file.path)?.[1];
    // _filename 有 `/`, 只需要 `/` 之前的字符
    if (_filename?.includes("/")) {
      _filename = _filename.split("/")[0];
    }
    // 读取文件内容
    const _content = await readFile(_file.path);

    if (_newPluginName !== _pluginName) {
      _newPluginName = _pluginName;
      _fileMap = Object.create({});
    }

    if (_filename) {
      _fileMap[_filename] = _content;

      // 将文件内容写入对应插件目录
      await createFile(
        `src/plugins/${_pluginName}/${dirName}/index.ts`,
        `// this file is auto generated. \nexport default ${
          JSON.stringify(_fileMap)
        }`,
        { banner: false },
      );
    }
  }
};

const packModule = () => {
  readdDir("shared");
  readdDir("template");
};

packModule();
