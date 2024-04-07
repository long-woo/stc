import type { IDefaultObject, WebClientConfig } from "../webClientBase.ts";

/**
 * Generate a request to a specified URL with the given parameters.
 *
 * @param {WebClientConfig} instance - the configuration for the request
 * @return {Promise<T>} a promise that resolves with the response data
 */
export const request = <T>(instance: WebClientConfig) => {
  // query 参数处理
  const _query: IDefaultObject<string> =
    (instance.params?.query as IDefaultObject<string>) ?? {};
  const _params = Object.keys(_query).reduce(
    (prev: Array<string>, current) => {
      prev.push(`${current}=${encodeURIComponent(_query[current])}`);
      return prev;
    },
    [],
  );

  return new Promise<T>((resolve, reject) => {
    // @ts-ignore
    wx.request({
      url: `${instance.baseURL}${instance.url}?${_params.join("&")}`,
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
