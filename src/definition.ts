import { IDefaultObject, ISwaggerResultDefinitions } from "./swagger.ts";

/**
 * 获取定义的名称
 * @param name - 定义的名称
 * @param isDefinition - 是否为定义
 * @returns
 */
const getDefinitionName = (name: string, isDefinition?: boolean): string => {
  const genericKey = ["T", "K", "U"];
  const keyLength = genericKey.length;

  // 处理泛型
  const newName = name.replace(/«(.*)?»/g, (_key: string, _value: string) => {
    const str = getDefinitionName(_value, isDefinition);

    // 定义的情况下，需要将具体名称换成 T、K、U...
    if (isDefinition) {
      const arr = str.split(/,\s*/g).map((_n: string, index: number) => {
        let newKey = genericKey[index % keyLength];
        // 当超过预设泛型 key 长度，自动加数字
        if (index >= keyLength) {
          newKey = newKey + Math.ceil((index - keyLength) / keyLength);
        }

        return newKey;
      });

      return `<${arr.join(", ")}>`;
    }

    return `<${str}>`;
  });

  return newName;
};

const getDefinitionContent = (): string => {
  return "";
};

export const generateDefinition = (
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  // 所有定义的 key
  const definitionKeys = Object.keys(definitions);

  definitionKeys.forEach((key) => {
    const name = getDefinitionName(key, true);
  });
};
