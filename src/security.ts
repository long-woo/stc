import {
  IDefaultObject,
  ISecurityVirtualProperty,
  ISwaggerResultSecurity,
} from "./swagger.ts";

export const generateSecurity = (
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
