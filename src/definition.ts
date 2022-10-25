import Logs from "./console.ts";
import {
  IDefaultObject,
  IDefinitionVirtualProperty,
  ISwaggerResultDefinition,
} from "./swagger.ts";
import { caseTitle } from "./util.ts";

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
 * 原始定义对象转换为虚拟定义对象
 * @param defName - 定义名
 * @param defItem - 定义名的属性
 * @returns
 */
const getVirtualProperties = (
  defName: string,
  defItem: ISwaggerResultDefinition,
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
export const getDefinition = (
  definitions: IDefaultObject<ISwaggerResultDefinition>,
): Map<string, IDefinitionVirtualProperty[]> => {
  const defMap = new Map<string, IDefinitionVirtualProperty[]>();

  Object.keys(definitions).forEach((key) => {
    const name = getDefinitionName(key, true);

    const isExistName = defMap.has(name);
    if (isExistName) return;

    const defItem = definitions[key];
    const props = getVirtualProperties(name, defItem);

    defMap.set(name, props);
  });

  return defMap;
};
