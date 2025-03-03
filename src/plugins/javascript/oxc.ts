import oxc from "npm:oxc-transform@^0.53.0";

import Logs from "../../console.ts";

/**
 * Generates a declaration file from the given source code.
 *
 * @param {string} sourceCode - The source code to generate the declaration file from.
 * @return {string} The generated declaration file content.
 */
export const generateDeclarationFile = (sourceCode: string): string => {
  const { errors, code } = oxc.isolatedDeclaration(
    `temp_${+new Date()}.ts`,
    sourceCode,
    {
      sourcemap: false,
    },
  );

  if (errors.length > 0) {
    Logs.error(errors.join("\n"));
    return "";
  }

  return code;
};

/**
 * Transforms the given source code into TypeScript, returning an object with the transformed code and declaration.
 *
 * @param {string} source - The source code to transform.
 * @return {{ code: string, declaration: string }} An object with the transformed code and declaration.
 */
export const oxcTransform = (
  source: string,
): { code: string; declaration?: string } => {
  const { code, declaration, errors } = oxc.transform(
    `temp_${+new Date()}.ts`,
    source,
    {
      typescript: {
        allowDeclareFields: false,
        declaration: {
          sourcemap: false,
        },
      },
    },
  );

  if (errors.length > 0) {
    Logs.error(errors.join("\n"));
    return { code: "", declaration: "" };
  }

  return {
    code,
    declaration,
  };
};
