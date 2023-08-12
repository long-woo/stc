import ts from "npm:typescript";
import fs from "node:fs";

export const generateDeclarationFile = (
  sourceCode: string,
) => {
  sourceCode = `export interface abc {
    a: number;
  };

  export function add(a: number, b: number): number {
    return a + b;
  }`;
  // 解析源代码为 AST
  const sourceFile = ts.createSourceFile(
    "temp.ts",
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
  );

  // 创建一个编译选项对象
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
  };

  // 使用 TypeScript 的编译器 API 来获取 AST 的类型检查信息
  const program = ts.createProgram([sourceFile.fileName], compilerOptions);
  program.getTypeChecker(); // 这将触发类型检查
  const emitResult = program.emit();
  console.log(emitResult);
  // 检查是否有编译错误
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(
    emitResult.diagnostics,
  );
  if (diagnostics.length > 0) {
    console.error(diagnostics);
    return;
  }

  // 将生成的声明文件内容读取并写入输出文件
  const declarationFilePath = sourceFile.fileName.replace(".ts", ".d.ts");
  const declarationFileContent = fs.readFileSync(declarationFilePath, "utf-8"); // ts.sys.readFile(declarationFilePath);

  // const declarations: string[] = [];

  // ts.forEachChild(sourceFile, (node) => {
  //   if (ts.isFunctionDeclaration(node)) {
  //     const name = node.name?.text;
  //     const returnType = node.type ? node.type.getText() : "any";

  //     const comment = ts.getSyntheticLeadingComments(node);

  //     if (comment) {
  //       const commentText = comment[0].text.trim();
  //       declarations.push(`/**\n * ${commentText}\n */`);
  //     }

  //     // declarations.push(`declare function ${name}(): ${returnType};`);
  //     declarations.push(`export declare function ${name}(): ${returnType};`);
  //   }
  // });

  // const declarationContent = declarations.join("\n\n");

  return declarationFileContent;
};
