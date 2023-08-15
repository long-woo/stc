import ts from "npm:typescript";

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
    export function add(a: number, b: number): number {
      return a + b;
    }
  `;
  const filename = "temp.ts";
  let declarationContent = "";

  // 创建一个编译选项对象
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    declaration: true,
    emitDeclarationOnly: true,
    skipDefaultLibCheck: true,
    skipLibCheck: true,
  };

  const sourceFile = ts.createSourceFile(
    filename,
    sourceCode,
    ts.ScriptTarget.ESNext,
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
