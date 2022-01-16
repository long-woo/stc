import Logs from "./console.ts";
import {
  IDefaultObject,
  ISwaggerDefinitionPropertiesItems,
  ISwaggerResultDefinitions,
  propertyType,
} from "./swagger.ts";

/**
 * 生成注释
 * @param comment - 注释描述
 * @param isIndent - 缩进
 * @returns
 */
const generateComment = (comment: string, isIndent = true) => {
  const indent = isIndent ? "\t" : "";

  return comment
    ? `
${indent}/**
${indent} * ${comment}
${indent} */`
    : "";
};

/**
 * 获取定义的名称
 * @param name - 定义的名称
 * @param isDefinition - 是否为定义
 * @returns
 */
const getDefinitionName = (name: string, isDefinition?: boolean): string => {
  const genericKey = ["T", "K", "U"];
  const keyLength = genericKey.length;

  name = name.replace("#/definitions/", "");

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

      return "any[]";
    case "object":
      return "IDefaultObject";
    default: {
      // 自定义类型
      const name = getDefinitionName(type);

      return name;
    }
  }
};

const getDefinitionProperty = (defItem: ISwaggerResultDefinitions): string => {
  if (defItem.type !== "object") {
    Logs.error("无法解析当前对象");
    return "";
  }

  const props = defItem.properties;

  const res = Object.keys(props).reduce((prev, current) => {
    const prop = props[current];
    const name = convertType(prop.type ?? "");
    const comment = generateComment(prop.description ?? "");

    prev.splice(-1, 0, `${comment}\t${current}: ${name}\n`);
    return prev;
  }, ["{", "\t}"]);

  return res.join("");
};

export const generateDefinition = (
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
) => {
  const defMap = new Map<string, string>();

  Object.keys(definitions).forEach((key) => {
    const name = getDefinitionName(key, true);

    const isExistName = defMap.has(name);
    if (isExistName) return;

    const defItem = definitions[key];
    const props = getDefinitionProperty(defItem);

    // 存储到 map 中，防止重复生成
    defMap.set(name, props);
  });
  console.log(defMap);
};
