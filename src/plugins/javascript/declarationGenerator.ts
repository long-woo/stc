import ts from "npm:typescript";
import vfs from "npm:@typescript/vfs";

export const generateDeclarationFile = (
  sourceCode: string,
) => {
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
    target: ts.ScriptTarget.ESNext,
    declaration: true,
    emitDeclarationOnly: true,
    lib: ["ESNext"],
  };

  // const fsMap = await vfs.createDefaultMapFromCDN(
  //   compilerOptions,
  //   ts.version,
  //   true,
  //   ts,
  // );
  // fsMap.set(filename, sourceCode);

  // const system = vfs.createSystem(fsMap);
  // const env = vfs.createVirtualTypeScriptEnvironment(
  //   system,
  //   [filename],
  //   ts,
  //   compilerOptions,
  // );

  // const output = env.languageService.getEmitOutput(filename);

  // const declarationContent = output.outputFiles.reduce((prev, current) => {
  //   prev += current.text;
  //   return prev;
  // }, "");

  // const host = vfs.createVirtualCompilerHost(system, compilerOptions, ts);
  // const program = ts.createProgram({
  //   rootNames: [...fsMap.keys()],
  //   options: compilerOptions,
  //   host: host.compilerHost,
  // });

  // // This will update the fsMap with new files
  // // for the .d.ts and .js files
  // program.emit();

  // const declarationFilePath = filename.replace(".ts", ".d.ts");
  // // const declarationFileContent = ts.sys.readFile(declarationFilePath);
  // // console.log(declarationFileContent);
  // const file = program.getSourceFile(filename);
  // console.log(file);
  let declarationContent = "";
  const sourceFile = ts.createSourceFile(
    filename,
    sourceCode,
    ts.ScriptTarget.ESNext,
    true,
  );

  const defaultCompilerHost = ts.createCompilerHost(compilerOptions);
  const host: ts.CompilerHost = {
    getSourceFile: (fileName, languageVersion) => {
      if (fileName === filename) {
        return sourceFile;
      }
      return defaultCompilerHost.getSourceFile(fileName, languageVersion);
    },
    writeFile: (_name, text) => {
      declarationContent = text;
      console.log(text);
    },
    getDefaultLibFileName: () => "lib.d.ts",
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => "",
    getNewLine: () => "\n",
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => "",
  };

  // 创建 TypeScript 编译器实例
  const program = ts.createProgram(
    [filename],
    compilerOptions,
    host,
  );

  // 执行编译并处理结果
  const emitResult = program.emit();

  if (emitResult.emitSkipped) {
    console.error("Compilation failed");
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
