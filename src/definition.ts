import Logs from "./console.ts";
import {
  IDefaultObject,
  IDefinitionNameMapping,
  IDefinitionVirtualProperty,
  ISwaggerResultDefinition,
} from "./swagger.ts";
import { getObjectKeyByValue, getRefType, upperCase } from "./util.ts";

/**
 * 获取定义
 * @param key - 定义的名称
 * @param isDefinition - 是否为定义
 * @returns
 */
const getDefinitionNameMapping = (
  key: string,
  isDefinition?: boolean,
): IDefinitionNameMapping => {
  const genericKey = ["T", "K", "U"];
  const keyLength = genericKey.length;

  const name = getRefType(key);
  let mappings: Record<string, string> = {};

  // 处理泛型
  const newName = name.replace(/«(.*)?»/g, (_key: string, _value: string) => {
    const def = getDefinitionNameMapping(_value, isDefinition);

    // 定义的情况下，需要将具体名称换成 T、K、U...
    if (isDefinition) {
      mappings = def.mappings ?? {};

      const arr = def.name.split(/,\s*/g).map((_n: string, index: number) => {
        let newKey = genericKey[index % keyLength];
        // 当超过预设泛型 key 长度，自动加数字
        if (index >= keyLength) {
          newKey = newKey + Math.ceil((index - keyLength) / keyLength);
        }

        if (!mappings[newKey]) {
          mappings[newKey] = _n;
        }

        return newKey;
      });

      return `<${arr.join(", ")}>`;
    }

    return `<${def.name}>`;
  });

  return {
    name: newName,
    mappings,
  };
};

/**
 * 原始定义对象转换为虚拟定义对象
 * @param defItem - 定义名的属性
 * @param defMapping - 定义
 * @returns
 */
const getVirtualProperties = (
  defItem: ISwaggerResultDefinition,
  defMapping: IDefinitionNameMapping,
): IDefinitionVirtualProperty[] => {
  if (defItem.type !== "object") {
    Logs.error("无法解析当前对象");
    return [];
  }

  const props = defItem.properties;
  const mappings = defMapping.mappings ?? {};

  const vProps = Object.keys(props).reduce(
    (prev: IDefinitionVirtualProperty[], current) => {
      const prop = props[current];

      // 必填属性
      const required = defItem.required?.includes(current) ?? false;
      // 属性枚举选项值
      const enumOption = prop.enum || [];
      // 属性 ref
      let refName = getDefinitionNameMapping(prop.$ref ?? "").name;
      if (prop.items) {
        refName = getDefinitionNameMapping(prop.items.$ref ?? "").name ||
          (prop.items.type ??
            "");
      }

      // 属性类型。若存在枚举选项，则需要声明一个“定义名 + 属性名”的枚举类型
      const type = enumOption.length
        ? defMapping.name + upperCase(current)
        : (getObjectKeyByValue(mappings, refName) || prop.type);

      prev.push({
        name: current,
        type,
        description: prop.description ?? "",
        required,
        enumOption,
        ref: refName,
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
    const def = getDefinitionNameMapping(key, true);
    const name = def.name;

    // 存在相同定义时，直接跳过
    const defKeys: string[] = [];
    defMap.forEach((_, key) => {
      defKeys.push(key.replace(/<.*>$/, ""));
    });
    if (defKeys.includes(name)) return;

    const props = getVirtualProperties(definitions[key], def);
    defMap.set(name, props);
  });

  return defMap;
};
