import ts from "npm:typescript";
import vfs from "npm:@typescript/vfs";

import Logs from "../../console.ts";
import { getT } from "../../i18n/index.ts";

/**
 * Generates a declaration file from the given source code.
 *
 * @param {string} sourceCode - The source code to generate the declaration file from.
 * @return {Promise<string>} The generated declaration file content.
 */
export const generateDeclarationFile = async (
  sourceCode: string,
): Promise<string> => {
  const filename = `temp_${+new Date()}.ts`;

  // 创建一个编译选项对象
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
  };

  // 创建一个虚拟文件系统映射，并加载 lib.d.ts 文件
  const fsMap = await vfs.createDefaultMapFromCDN(
    compilerOptions,
    ts.version,
    true,
    ts,
  );
  fsMap.set(filename, sourceCode);

  // 创建虚拟文件系统
  const system = vfs.createSystem(fsMap);

  // 创建虚拟 TypeScript 环境
  const env = vfs.createVirtualTypeScriptEnvironment(
    system,
    [filename],
    ts,
    compilerOptions,
  );

  // 获取 TypeScript 编译输出
  const output = env.languageService.getEmitOutput(filename);

  // 将输出的声明文件内容拼接起来
  const declarationContent = output.outputFiles.reduce((prev, current) => {
    prev += current.text;
    return prev;
  }, "");

  // 创建虚拟编译器主机
  const host = vfs.createVirtualCompilerHost(system, compilerOptions, ts);
  // 创建 TypeScript 程序
  const program = ts.createProgram({
    rootNames: [...fsMap.keys()],
    options: compilerOptions,
    host: host.compilerHost,
  });

  // 执行编译并获取输出结果
  const emitResult = program.emit();

  if (emitResult.emitSkipped) {
    Logs.error(getT("$t(plugin_javascript.compilation_failed)"));

    const allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!,
        );
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n",
        );
        Logs.error(
          `${diagnostic.file.fileName} (${line + 1}, ${
            character + 1
          }): ${message}`,
        );
      } else {
        Logs.error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      }
    });
  } else {
    const sourceFile = program.getSourceFile(filename);

    // console.log(sourceFile);
    sourceFile?.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        console.log(node.getText());
      }
    });
  }

  return declarationContent;
};
