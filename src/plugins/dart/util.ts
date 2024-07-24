export const convertType = (type: string | string[], ref?: string) => {
  // 当只有 ref 或者 type 为 object 时，直接返回 ref
  if ((!type || type === "object") && ref) return ref;

  // 若 type 与 ref 相等，则表示为自定义类型
  if (type === ref) return type || "dynamic";

  const _action: Record<string, string> = {
    string: "String",
    integer: "int",
    boolean: "bool",
    array: `List<${ref && convertType(ref) || "dynamic"}>`,
    object: "Map<string, dynamic>",
    null: "null",
  };

  const _newType = Array.isArray(type) ? type : [type];
  const _type = _newType
    .map((item) => _action[item] || item)
    .filter((item) => item)
    .join(" | ");

  return _type;
};
