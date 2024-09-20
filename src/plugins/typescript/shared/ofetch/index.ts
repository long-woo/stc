import { ofetch } from "ofetch";

import type { ApiClientConfig, IDefaultObject } from "../apiClientBase";

let ofetchInstance = null;

// TODO
export const createOfetch = (
  config: Omit<ApiClientConfig, "url" | "signal" | "config">,
) => {
  ofetchInstance = ofetch.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 5000,
  });
};
