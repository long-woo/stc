import { IDefaultObject, ISwaggerResultPaths } from "./swagger.ts";

export const generatePath = (
  paths: IDefaultObject<IDefaultObject<ISwaggerResultPaths>>,
) => {
  const pathMap = new Map<string, any[]>();

  Object.keys(paths).forEach((url) => {
  });
};
