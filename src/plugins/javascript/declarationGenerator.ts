import ts from "npm:typescript";
import vfs from "npm:@typescript/vfs";

export const generateDeclarationFile = async (sourceCode: string) => {
  sourceCode = `
    export type TypeTest = 1 | 0 | 3;
    export interface ISwagger {
      name: string;
      age: number;
      test: Array<string>;
    }

    /**
     * Adds two numbers.
     * @param a The first number.
     * @param b The second number.
     * @returns The sum of a and b.
     */
    export function add(a: any, b: any): number {
      return a + b;
    }
  `;
  const filename = "temp.ts";

  // 创建一个编译选项对象
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    lib: ["ESNext"],
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

  // const declarationFilePath = filename.replace(".ts", ".d.ts");
  // // const declarationFileContent = ts.sys.readFile(declarationFilePath);
  // // console.log(declarationFileContent);
  // const file = program.getSourceFile(filename);
  // console.log(file);

  if (emitResult.emitSkipped) {
    console.error("Compilation failed.");
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
        console.log(
          `${diagnostic.file.fileName} (${line + 1},${
            character + 1
          }): ${message}`,
        );
      } else {
        console.log(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      }
    });
  }

  return declarationContent;
};
