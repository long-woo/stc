import type { ApiClientConfig, IDefaultObject } from "../apiClientBase";
import { getRequestParams } from "../apiClientBase";

/**
 * Wraps a fetch request to enforce a timeout.
 *
 * @param {RequestInfo} url - The resource URL.
 * @param {RequestInit} init - Custom settings for the fetch request.
 * @param {number} timeout - The timeout in milliseconds.
 * @returns {Promise<Response>} A promise that either resolves with the fetch response or rejects with a timeout error.
 */
const fetchWithTimeout = (
  url: RequestInfo,
  init?: RequestInit,
  timeout = 5000,
): Promise<Response> => {
  const timeoutPromise = new Promise<Response>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), timeout)
  );

  return Promise.race([fetch(url, init), timeoutPromise]);
};

/**
 * Asynchronous function that sends a request using the provided ApiClientConfig instance with timeout handling.
 *
 * @param {ApiClientConfig} instance - the configuration object for the request
 * @return {Promise<T>} a Promise that resolves with the response data
 */
export const request = async <T>(instance: ApiClientConfig): Promise<T> => {
  const _params = getRequestParams(
    (instance.params?.query as IDefaultObject<string>) ?? {},
  );
  const _url = `${instance.baseURL}${instance.url}?${_params}`;

  const _res = await fetchWithTimeout(_url, {
    method: instance.method,
    body: JSON.stringify(instance.params?.body ?? {}),
    headers: {
      "Content-Type": "application/json",
      ...(instance.params?.header ?? {}),
    },
    credentials: instance.withCredentials ? "include" : "omit",
  }, instance.timeout);

  if (!_res.ok) {
    instance.onError?.(_res.statusText);
  }

  if (_res.status === 401) {
    instance.onLogin?.();
  }

  const _json: T = await _res.json();

  return _json;
};
