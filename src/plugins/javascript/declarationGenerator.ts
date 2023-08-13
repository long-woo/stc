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

  // 创建一个编译选项对象
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    declaration: true,
    emitDeclarationOnly: true,
    skipDefaultLibCheck: true,
    skipLibCheck: true,
    noLib: true,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const sourceFile = ts.createSourceFile(
    "temp.ts",
    sourceCode,
    ts.ScriptTarget.ESNext,
  );

  host.getSourceFile = (fileName, languageVersion) => {
    if (fileName === "temp.ts") {
      return sourceFile;
    }
    return undefined;
  };

  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node)) {
      console.log(node.getText());
    }
  });

  // 创建 TypeScript 编译器实例
  const program = ts.createProgram(
    ["temp.ts"],
    compilerOptions,
    host,
  );

  const _sourceFile = program.getSourceFile("temp.ts");
  // console.log(_sourceFile?.getFullText());
  const dtsSourceFile = program.getSourceFile("temp.d.ts");
  // console.log(dtsSourceFile);
  // // 执行编译并处理结果
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
  } else {
    console.log("Compilation successful");
  }

  // const types: string[] = [];

  // ts.forEachChild(sourceFile, (node) => {
  //   if (ts.isInterfaceDeclaration(node)) {
  //     types.push(node.name.text);
  //   }
  // });

  // return types.join("\n\n");
  return "";
};
