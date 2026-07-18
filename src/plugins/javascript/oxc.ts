import { isolatedDeclarationSync, transformSync } from "oxc-transform";

import Logs from "../../console.ts";

const formatOxcError = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    const message = typeof obj.message === "string"
      ? obj.message
      : JSON.stringify(obj, null, 2);
    const codeframe = typeof obj.codeframe === "string"
      ? obj.codeframe
      : undefined;
    return [message, codeframe].filter(Boolean).join("\n\n");
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

const formatOxcErrors = (errors: unknown[]): string =>
  errors.map((error) => formatOxcError(error)).join("\n\n");

/**
 * Generates a declaration file from the given source code.
 *
 * @param {string} sourceCode - The source code to generate the declaration file from.
 * @return {string} The generated declaration file content.
 */
export const generateDeclarationFile = (sourceCode: string): string => {
  const { errors, code } = isolatedDeclarationSync(
    `temp_${+new Date()}.ts`,
    sourceCode,
    {
      sourcemap: false,
    },
  );

  if (errors.length > 0) {
    Logs.error(formatOxcErrors(errors));
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
  const { code, declaration, errors } = transformSync(
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
    Logs.error(formatOxcErrors(errors));
    return { code: "", declaration: "" };
  }

  return {
    code,
    declaration,
  };
};
