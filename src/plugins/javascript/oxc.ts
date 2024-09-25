import oxc from "npm:oxc-transform@^0.30.1";

import Logs from "../../console.ts";

/**
 * Generates a declaration file from the given source code.
 *
 * @param {string} sourceCode - The source code to generate the declaration file from.
 * @return {string} The generated declaration file content.
 */
export const generateDeclarationFile = (sourceCode: string) => {
  const filename = `temp_${+new Date()}.ts`;

  const { errors, code } = oxc.isolatedDeclaration(filename, sourceCode, {
    sourcemap: false,
  });

  if (errors.length > 0) {
    Logs.error(errors.join("\n"));
    return "";
  }

  return code;
};
