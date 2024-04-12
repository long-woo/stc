import type { ApiClientConfig, IDefaultObject } from "../apiClientBase.ts";
import { getRequestParams } from "../apiClientBase.ts";

/**
 * Generate a request to a specified URL with the given parameters.
 *
 * @param {ApiClientConfig} instance - the configuration for the request
 * @return {Promise<T>} a promise that resolves with the response data
 */
export const request = <T>(instance: ApiClientConfig): Promise<T> => {
  const _params = getRequestParams(
    (instance.params?.query as IDefaultObject<string>) ?? {},
  );

  return new Promise<T>((resolve, reject) => {
    // @ts-ignore
    wx.request({
      url: `${instance.baseURL}${instance.url}?${_params}`,
      method: instance.method,
      data: (instance.params?.body ?? {}) as IDefaultObject,
      header: (instance.params?.header ?? {}) as IDefaultObject,
      success: (
        // @ts-ignore
        res,
      ) => {
        const resData: any = res.data ?? {};

        if (!resData.success) {
          instance.onError?.(resData.message);
        }
        resolve(resData);
      },
      fail: (
        // @ts-ignore
        err,
      ) => {
        instance.onError?.(err.errMsg);
        reject(err);
      },
    });
  });
};
