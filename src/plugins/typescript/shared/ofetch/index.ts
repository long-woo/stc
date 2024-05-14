import { ofetch } from "ofetch";

import type { ApiClientConfig, IDefaultObject } from "../apiClientBase.ts";

let ofetchInstance = null;

export const createOfetch = (
  config: Omit<ApiClientConfig, "url" | "signal" | "config">,
) => {
  ofetchInstance = ofetch.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 5000,
  });
};
