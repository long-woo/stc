import axios from "axios";

import type { IDefaultObject, WebClientConfig } from "../webClientBase.ts";

export const request = <T>(
  instance: WebClientConfig,
) => {
  const _formData: IDefaultObject = instance.params?.formData as IDefaultObject;

  let _data: IDefaultObject | FormData | unknown = instance.params?.body;

  // 处理 FormData 数据
  if (_formData) {
    const formData = new FormData();

    Object.keys(_formData).forEach((key) => {
      formData.append(key, _formData[key] as string | Blob);
    });

    _data = formData;
  }

  return axios.request<T, T>({
    url: instance.url,
    method: instance.method,
    data: _data,
    params: instance.params?.query,
    headers: instance.params?.header,
    timeout: instance.config?.timeout,
    signal: instance.config?.signal,
  });
};
