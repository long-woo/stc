import type { ApiClientConfig, IDefaultObject } from "../apiClientBase.ts";
import { getRequestParams } from "../apiClientBase.ts";

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
  timeout: number = 5000,
): Promise<Response> => {
  const timeoutPromise = new Promise<Response>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), timeout)
  );

  return Promise.race([fetch(url, init), timeoutPromise]);
};

export const request = async <T>(instance: ApiClientConfig) => {
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
