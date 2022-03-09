import Logs from "./console.ts";
import {
  IDefaultObject,
  IDefinitionVirtualProperty,
  ISwaggerDefinitionProperties,
  ISwaggerResultDefinitions,
} from "./swagger.ts";
import { caseTitle } from "./util.ts";

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
 * @param prop - 属性基础类型
 * @returns
 */
const convertType = (prop: ISwaggerDefinitionProperties): string => {
  // 首先判断 type 是否定义，其次判断 $ref 是否定义
  const type = prop.type ?? prop.$ref ?? "any";

  switch (type) {
    case "integer":
      return "number";
    case "array": {
      const propItem = prop.items;

      if (propItem?.type) {
        const childType = convertType(propItem);

        return `${childType}[]`;
      }

      if (propItem?.$ref) {
        const name = getDefinitionName(propItem.$ref);
        const value = `${name}[]`;

        return value;
      }

      return "any[]";
    }
    case "object":
      return "IDefaultObject";
    default: {
      // 自定义类型
      if (type.includes("definitions")) {
        const name = getDefinitionName(type);

        return name;
      }

      return type;
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

    // 必填属性
    const isRequired = defItem.required?.includes(current);

    const propName = current + (isRequired ? "" : "?");
    const propType = convertType(prop);
    const comment = generateComment(prop.description ?? "");
    const enumOption = prop.enum || [];

    prev.splice(
      -1,
      0,
      `${comment}\n\t${propName}: ${propType}`,
    );
    return prev;
  }, ["{", "\n}"]);

  return res.join("");
};

/**
 * 原始定义对象转换为虚拟定义对象
 * @param defName - 定义名
 * @param defItem - 定义名的属性
 * @returns
 */
const getVirtualPropertys = (
  defName: string,
  defItem: ISwaggerResultDefinitions,
): IDefinitionVirtualProperty[] => {
  if (defItem.type !== "object") {
    Logs.error("无法解析当前对象");
    return [];
  }

  const props = defItem.properties;

  const vProps = Object.keys(props).reduce(
    (prev: IDefinitionVirtualProperty[], current) => {
      const prop = props[current];

      // 必填属性
      const required = defItem.required?.includes(current) ?? false;
      // 属性枚举选项值
      const enumOption = prop.enum || [];
      // 属性 ref
      let ref = getDefinitionName(prop.$ref ?? "");
      if (prop.items) {
        ref = getDefinitionName(prop.items.$ref ?? "") || (prop.items.type ??
          "");
      }
      // 属性类型。若存在枚举选项，则需要声明一个“定义名 + 属性名”的枚举类型
      // 若类型为空，可能为自定义类型
      const type = enumOption.length
        ? defName + caseTitle(current)
        : (prop.type ?? ref);

      prev.push({
        name: current,
        type,
        description: prop.description ?? "",
        required,
        enumOption,
        ref,
        format: prop.format ?? "",
      });
      return prev;
    },
    [],
  );

  return vProps;
};

/**
 * 生成定义对象
 * @param definitions - 定义对象
 * @returns
 */
export const generateDefinition = (
  definitions: IDefaultObject<ISwaggerResultDefinitions>,
): Map<string, IDefinitionVirtualProperty[]> => {
  const defMap = new Map<string, IDefinitionVirtualProperty[]>();

  Object.keys(definitions).forEach((key) => {
    const name = getDefinitionName(key, true);

    const isExistName = defMap.has(name);
    if (isExistName) return;

    const defItem = definitions[key];
    const props = getVirtualPropertys(name, defItem);

    defMap.set(name, props);
  });

  return defMap;
};
