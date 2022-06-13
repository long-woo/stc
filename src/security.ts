import {
  IDefaultObject,
  ISecurityVirtualProperty,
  ISwaggerResultSecurity,
} from "./swagger.ts";

/**
 * 获取 auth 定义
 * @param securityDefinitions
 * @returns
 */
export const getSecurityDefinition = (
  securityDefinitions: IDefaultObject<ISwaggerResultSecurity>,
): Map<string, ISecurityVirtualProperty> => {
  const securityMap = new Map<string, ISecurityVirtualProperty>();

  if (!securityDefinitions) return securityMap;

  Object.keys(securityDefinitions).forEach(
    (key) => {
      const item = securityDefinitions[key];

      const name = item.name ?? key;
      const value: ISecurityVirtualProperty = {
        type: item.in ?? item.type,
        name,
        authorizationUrl: item.authorizationUrl ?? "",
        scopes: item.scopes ?? {},
      };

      securityMap.set(name, value);
    },
  );

  return securityMap;
};
