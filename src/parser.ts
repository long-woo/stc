import { parse as parseYaml } from "@std/yaml";
import type { ISwaggerResult } from "./swagger.ts";
import { getT } from "./i18n/index.ts";

const YAML_EXT_REG = /\.(ya?ml)(?:[?#].*)?$/i;

/**
 * 根据来源路径或地址的扩展名判断是否为 YAML 文件
 * @param source - 文件路径或远程地址
 */
const isYamlSource = (source: string) => YAML_EXT_REG.test(source);

/**
 * 解析 OpenAPI/Swagger 文档内容，支持 JSON 和 YAML 两种格式
 *
 * 解析策略：
 * 1. 来源路径扩展名为 `.yaml`/`.yml` 时，直接按 YAML 解析
 * 2. 其余情况优先按 JSON 解析，失败后回退为 YAML 解析（兼容无扩展名的远程地址）
 *
 * @param content - 文档文本内容
 * @param source - 来源文件路径或远程地址，用于格式检测
 * @returns 解析后的 Swagger 结果
 */
export const parseSpec = (
  content: string,
  source = "",
): ISwaggerResult => {
  const text = content.trim();

  if (!text) {
    throw new Error(getT("$t(app.specEmpty)"));
  }

  const data = isYamlSource(source) ? parseYaml(text) : parseJsonOrYaml(text);

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(getT("$t(app.specInvalid)"));
  }

  return data as ISwaggerResult;
};

/**
 * 优先按 JSON 解析，失败后回退为 YAML 解析
 * @param text - 文本内容
 */
const parseJsonOrYaml = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    // JSON 解析失败，尝试按 YAML 解析（合法 JSON 也是合法 YAML，因此回退是安全的）
    return parseYaml(text);
  }
};
