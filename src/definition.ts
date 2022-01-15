import Logs from "./console.ts";
import {
  IDefaultObject,
  ISwaggerDefinitionPropertiesItems,
  ISwaggerResultDefinitions,
  propertyType,
} from "./swagger.ts";

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

/**
 * 转换为 TypeScript 类型
 * @param type - 属性基础类型
 * @param typeItem - 属性非基础类型
 * @param defKey - 定义源中的 key
 * @returns
 */
const convertType = (
  type: string,
  typeItem?: ISwaggerDefinitionPropertiesItems,
): string => {
  switch (type) {
    case "integer":
      return "number";
    case "array":
      if (typeItem?.type) {
        const childType = convertType(typeItem.type);

        return `${childType}[]`;
      }

      if (typeItem?.$ref) {
        const name = getDefinitionName(typeItem.$ref);
        const value = `${name}[]`;

        return value;
      }

      return "[]";
    case "object": {
      return "IDefaultObject";
    }
    default:
      // 自定义类型
      if (type.includes("definitions")) {
        const name = getDefinitionName(type);

        return name;
      }

      return type;
  }
};

const getDefinitionProperty = (defItem: ISwaggerResultDefinitions): string => {
  if (defItem.type !== "object") {
    Logs.error("无法解析当前对象");
    return "";
  }

  const props = defItem.properties;
  const propKeys = Object.keys(props);

  propKeys.forEach((key) => {
    const name = convertType(key);
  });
  return "";
};

export const generateDefinition = (
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const defMap = new Map<string, string>();
  // 所有定义的 key
  const definitionKeys = Object.keys(definitions);

  definitionKeys.forEach((key) => {
    const name = getDefinitionName(key, true);

    const isExistName = defMap.has(name);
    if (isExistName) return;

    const defItem = definitions[key];
    const props = getDefinitionProperty(defItem);

    // 存储到 map 中，防止重复生成
    defMap.set(name, props);
  });
};
