import minimist from "minimist";
export type Args = minimist.ParsedArgs;
export interface ParseOptions {
  boolean: string[];
  string: string[];
  alias: Record<string, string>;
  collect: string[];
  unknown: (arg: string) => void;
}
export const parseArgs = (args: string[], options: ParseOptions): Args => {
  const parsed = minimist(args, {
    boolean: options.boolean,
    string: options.string,
    alias: options.alias,
    unknown: (arg: string) => {
      options.unknown(arg);
      return false;
    },
  });
  for (const key of options.collect) {
    if (typeof parsed[key] === "string") parsed[key] = [parsed[key]];
  }
  return parsed;
};
