// this file is auto generated. 
export default {"apiClientBase":"export interface IDefaultObject<T = unknown> {\n  [key: string]: T;\n};\n\nexport type ApiClientMethod = \"GET\" | \"POST\" | \"PUT\" | \"DELETE\";\n\nexport interface ApiClientParams {\n  path?: IDefaultObject;\n  query?: IDefaultObject;\n  body?: any;\n  formData?: IDefaultObject;\n  header?: IDefaultObject;\n}\n\nexport interface ApiClientConfig {\n  baseURL?: string\n  url?: string\n  method?: ApiClientMethod\n  params?: ApiClientParams\n  timeout?: number\n  signal?: AbortSignal\n  withCredentials?: boolean\n  /**\n   * 忽略错误发生的 url 或 baseURL，不触发 error 回调函数。示例：/api/test\n   */\n  errorIgnore?: string[]\n  config?: Pick<ApiClientConfig, 'baseURL' | 'timeout' | 'signal'>\n  /**\n   * 错误回调函数\n   */\n  onError?: (message: string) => void\n  onLogin?: () => void\n}\n\n/**\n * Generates a new URL by replacing placeholders in the input URL with values from the provided path object.\n *\n * @param {string} url - The original URL with placeholders to be replaced.\n * @param {IDefaultObject} [path] - An optional object containing key-value pairs to replace in the URL.\n * @return {string} The new URL with placeholders replaced by values from the path object.\n */\nexport const generateURL = (url: string, path?: IDefaultObject): string => {\n  const newURL = url.replace(\n    /[\\\\{|:](\\w+)[\\\\}]?/gi,\n    (_key: string, _value: string): string => {\n      return path ? (path[_value] as string) : \"\";\n    },\n  );\n\n  return newURL;\n};\n\n/**\n * Returns an array of query parameters formatted as key-value pairs joined by \"&\".\n *\n * @param {IDefaultObject<string>} query - An object containing query parameters.\n * @return {string} The formatted query parameters joined by \"&\".\n */\nexport const getRequestParams = (query: IDefaultObject<string>): string =>\n  Object.keys(query).reduce(\n    (prev: Array<string>, current) => {\n      prev.push(`${current}=${encodeURIComponent(query[current])}`);\n      return prev;\n    },\n    [],\n  ).join(\"&\");\n","axios":"import type {\n  AxiosHeaders,\n  AxiosInstance,\n  AxiosRequestConfig,\n  AxiosResponse,\n  InternalAxiosRequestConfig,\n} from \"axios\";\nimport axios from \"axios\";\n\nimport type { ApiClientConfig, IDefaultObject } from \"../apiClientBase\";\n\nlet axiosInstance: AxiosInstance;\nlet errorIgnore: string[] = [];\nlet onError: ((message: string) => void) | undefined;\nlet onLogin: (() => void) | undefined;\n\nconst requestInterceptor = () => {\n  axiosInstance.interceptors.request.use(\n    (config: InternalAxiosRequestConfig<any>) => {\n      return config;\n    },\n    (error: any) => {\n      return Promise.resolve(error);\n    },\n  );\n};\n\nconst responseInterceptor = () => {\n  axiosInstance.interceptors.response.use(\n    (response: AxiosResponse<any, any>) => {\n      const _data = response.data;\n      const _config = response.config;\n      const _errorIgnore = errorIgnore.includes(_config.url ?? \"\") ||\n        errorIgnore.includes(_config.baseURL ?? \"\");\n\n      // 全局提示。忽略排除的 url 或 baseURL\n      if (!_errorIgnore) {\n        onError?.(_data);\n      }\n\n      if (response.status === 401) {\n        onLogin?.();\n      }\n\n      return _data;\n    },\n    (error: any) => {\n      // 取消的请求，无需抛出错误到 'onError' 回调函数\n      if (!axios.isCancel(error)) {\n        onError?.(\"network error.\");\n      }\n\n      return Promise.resolve(error);\n    },\n  );\n};\n\n/**\n * Creates an Axios instance with the provided configuration.\n *\n * @param {Omit<ApiClientConfig, \"url\" | \"signal\" | \"config\">} config - The configuration object for the Axios instance.\n */\nexport const createAxios = (\n  config: Omit<ApiClientConfig, \"url\" | \"signal\" | \"config\">,\n): void => {\n  axiosInstance = axios.create({\n    baseURL: config.baseURL,\n    timeout: config.timeout ?? 5000,\n    withCredentials: config.withCredentials ?? false,\n  });\n\n  errorIgnore = config.errorIgnore ?? [];\n  onError = config.onError;\n  onLogin = config.onLogin;\n\n  requestInterceptor();\n  responseInterceptor();\n};\n\n/**\n * Makes a request using the provided configuration.\n *\n * @param {ApiClientConfig} config - The configuration object for the request.\n * @return {Promise<T>} A promise that resolves with the response data.\n */\nexport const request = <T>(\n  config: ApiClientConfig,\n): Promise<T> => {\n  const _formData: IDefaultObject = config.params?.formData as IDefaultObject;\n\n  let _data: IDefaultObject | FormData | unknown = config.params?.body;\n\n  // 处理 FormData 数据\n  if (_formData) {\n    const formData = new FormData();\n\n    Object.keys(_formData).forEach((key) => {\n      formData.append(key, _formData[key] as string | Blob);\n    });\n\n    _data = formData;\n  }\n\n  return axiosInstance.request<T, T>({\n    url: config.url,\n    method: config.method,\n    data: _data,\n    params: config.params?.query,\n    headers: config.params?.header as AxiosHeaders,\n    timeout: config.config?.timeout,\n    signal: config.config?.signal,\n    baseURL: config.config?.baseURL,\n  });\n};\n","fetch":"import type { ApiClientConfig, IDefaultObject } from \"../apiClientBase\";\nimport { getRequestParams } from \"../apiClientBase\";\n\n/**\n * Wraps a fetch request to enforce a timeout.\n *\n * @param {RequestInfo} url - The resource URL.\n * @param {RequestInit} init - Custom settings for the fetch request.\n * @param {number} timeout - The timeout in milliseconds.\n * @returns {Promise<Response>} A promise that either resolves with the fetch response or rejects with a timeout error.\n */\nconst fetchWithTimeout = (\n  url: RequestInfo,\n  init?: RequestInit,\n  timeout = 5000,\n): Promise<Response> => {\n  const timeoutPromise = new Promise<Response>((_, reject) =>\n    setTimeout(() => reject(new Error(\"Request timed out\")), timeout)\n  );\n\n  return Promise.race([fetch(url, init), timeoutPromise]);\n};\n\n/**\n * Asynchronous function that sends a request using the provided ApiClientConfig instance with timeout handling.\n *\n * @param {ApiClientConfig} instance - the configuration object for the request\n * @return {Promise<T>} a Promise that resolves with the response data\n */\nexport const request = async <T>(instance: ApiClientConfig): Promise<T> => {\n  const _params = getRequestParams(\n    (instance.params?.query as IDefaultObject<string>) ?? {},\n  );\n  const _url = `${instance.baseURL}${instance.url}?${_params}`;\n\n  const _res = await fetchWithTimeout(_url, {\n    method: instance.method,\n    body: JSON.stringify(instance.params?.body ?? {}),\n    headers: {\n      \"Content-Type\": \"application/json\",\n      ...(instance.params?.header ?? {}),\n    },\n    credentials: instance.withCredentials ? \"include\" : \"omit\",\n  }, instance.timeout);\n\n  if (!_res.ok) {\n    instance.onError?.(_res.statusText);\n  }\n\n  if (_res.status === 401) {\n    instance.onLogin?.();\n  }\n\n  const _json: T = await _res.json();\n\n  return _json;\n};\n","fetchRuntime":"import type {\n  ApiClientConfig,\n  ApiClientMethod,\n  ApiClientParams,\n  IDefaultObject\n} from \"./apiClientBase\";\nimport { generateURL } from \"./apiClientBase\";\nimport { <% if (it.client === 'axios') { %> createAxios, <% } %>request } from \"./<%= it.client %>\";\n\nlet apiClientConfig: ApiClientConfig = {};\n\nexport const createApiClient = (\n  config: Omit<ApiClientConfig, \"url\" | \"signal\" | \"config\">,\n): void => {\n  apiClientConfig = config;\n<% if (it.client === \"axios\") { %>\n  createAxios(config);\n<% } %>\n};\n\nexport const fetchRuntime = <T>(\n  url: string,\n  method: ApiClientMethod,\n  req?: ApiClientParams,\n  config?: ApiClientConfig['config'],\n): Promise<T> => {\n  const _url = generateURL(url, req?.path as unknown as IDefaultObject);\n\n  apiClientConfig.url = _url;\n  apiClientConfig.method = method;\n  apiClientConfig.params = req;\n  apiClientConfig.config = config;\n\n  return request<T>(apiClientConfig);\n};\n","ofetch":"import { ofetch } from \"ofetch\";\n\nimport type { ApiClientConfig, IDefaultObject } from \"../apiClientBase\";\n\nlet ofetchInstance = null;\n\n// TODO\nexport const createOfetch = (\n  config: Omit<ApiClientConfig, \"url\" | \"signal\" | \"config\">,\n) => {\n  ofetchInstance = ofetch.create({\n    baseURL: config.baseURL,\n    timeout: config.timeout ?? 5000,\n  });\n};\n","wechat":"import type { ApiClientConfig, IDefaultObject } from \"../apiClientBase\";\nimport { getRequestParams } from \"../apiClientBase\";\n\n/**\n * Generate a request to a specified URL with the given parameters.\n *\n * @param {ApiClientConfig} instance - the configuration for the request\n * @return {Promise<T>} a promise that resolves with the response data\n */\nexport const request = <T>(instance: ApiClientConfig): Promise<T> => {\n  const _params = getRequestParams(\n    (instance.params?.query as IDefaultObject<string>) ?? {},\n  );\n\n  return new Promise<T>((resolve, reject) => {\n    // @ts-ignore\n    wx.request({\n      url: `${instance.baseURL}${instance.url}?${_params}`,\n      method: instance.method,\n      data: (instance.params?.body ?? {}) as IDefaultObject,\n      header: (instance.params?.header ?? {}) as IDefaultObject,\n      success: (\n        // @ts-ignore\n        res,\n      ) => {\n        const resData: any = res.data ?? {};\n\n        if (!resData.success) {\n          instance.onError?.(resData.message);\n        }\n        resolve(resData);\n      },\n      fail: (\n        // @ts-ignore\n        err,\n      ) => {\n        instance.onError?.(err.errMsg);\n        reject(err);\n      },\n    });\n  });\n};\n"}