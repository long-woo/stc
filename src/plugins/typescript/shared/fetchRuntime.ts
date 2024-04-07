import type {
  IDefaultObject,
  WebClientConfig,
  WebClientMethod,
  WebClientParams,
} from "./webClientBase.ts";
import { generateURL } from "./webClientBase.ts";
import { request } from "./wechat/index.ts";

let webClientInstance: WebClientConfig;

export const createWebClient = (
  config: Pick<
    WebClientConfig,
    "baseURL" | "timeout" | "onError" | "errorIgnore"
  >,
) => {
  webClientInstance = config;
};

export const webClient = <T>(
  url: string,
  method: WebClientMethod,
  req?: WebClientParams,
  config?: WebClientConfig,
) => {
  const _url = generateURL(url, req?.path as unknown as IDefaultObject);

  webClientInstance.url = _url;
  webClientInstance.method = method;
  webClientInstance.params = req;
  webClientInstance.config = config;

  return request<T>(webClientInstance);
};
