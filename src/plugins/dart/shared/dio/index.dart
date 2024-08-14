import 'package:dio/dio.dart';

import '../api_client_base.dart';

Dio dio = Dio();

var onError;
var onLogin;

///  添加拦截器
void addInterceptor() {
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
      /// 如果你想完成请求并返回一些自定义数据，你可以使用 `handler.resolve(response)`。
      /// 如果你想终止请求并触发一个错误，你可以使用 `handler.reject(error)`。
      return handler.next(options);
    },
    onResponse: (Response response, ResponseInterceptorHandler handler) {
      /// 如果你想终止请求并触发一个错误，你可以使用 `handler.reject(error)`。
      return handler.next(response);
    },
    onError: (DioException error, ErrorInterceptorHandler handler) {
      /// 如果你想完成请求并返回一些自定义数据，你可以使用 `handler.resolve(response)`。
      return handler.next(error);
    },
  ));
}

/// 创建一个 Dio 实例
void createDio(ApiCreateConfig options) {
  dio = Dio(BaseOptions(
      baseUrl: options.baseURL,
      connectTimeout: options.connectTimeout,
      receiveTimeout: options.receiveTimeout));

  onError = options.onError;
  onLogin = options.onLogin;

  addInterceptor();
}

/// Parses the given [url] by replacing the path parameters with their corresponding values from the [pathParams] map.
///
/// The [url] parameter is the original URL string that may contain path parameters enclosed in curly braces.
/// The [pathParams] parameter is a map where the keys are the path parameter names and the values are the corresponding replacement values.
///
/// Returns the parsed URL string with the path parameters replaced by their corresponding values.
String parseUrl(String url, Map<String, String> pathParams) {
  if (pathParams.isEmpty) return url;

  var newUrl = url.replaceAllMapped(RegExp(r'[\{|:](\w+)[\}]?'), (m) {
    return pathParams[m[1]] ?? '';
  });

  return newUrl;
}

/// Makes a request using the provided [ApiClientConfig] instance.
///
/// The [instance] parameter is the configuration for the request. It includes the URL, parameters, method, and callbacks.
///
/// Returns a [Future] that resolves to the response data of type [T].
///
/// Throws a [DioException] if the request fails. The exception contains the response data if available.
Future<T> request<T>(ApiClientConfig instance,
    T Function(Map<String, dynamic>)? fromJson) async {
  // Parse the URL by replacing path parameters with their corresponding values
  var url = parseUrl(instance.url, (instance.params?['path']) ?? {});

  if (instance.baseURL != null) {
    url = '${instance.baseURL!}$url';
  }

  print(url);

  try {
    // Make the request using Dio
    final response = await dio.request(
      url,
      queryParameters: instance.params?['query'] ?? {},
      data: instance.params?['body'] ?? {},
      options: Options(
        method: instance.method,
        headers: instance.params?['headers'] ?? {},
        receiveTimeout: instance.timeout,
      ),
    );

    // If the response status code is 401, call the onLogin callback
    if (response.statusCode == 401) {
      onLogin?.call();
    }

    // Return the response data as type T
    return fromJson != null ? fromJson(response.data) : response.data;
  } on DioException catch (e) {
    var _message = e.response?.statusMessage ?? e.message.toString();

    // If the response is not null and the status code is not ok, call the onError callback with the status message
    if (e.response != null && !e.response!.statusCode!.isOk) {
      onError?.call(_message);

      if (e.response!.statusCode == 401) {
        onLogin?.call();
      }
    }

    return fromJson != null
        ? fromJson({'success': false, 'message': _message})
        : {'success': false, 'message': _message} as T;
  }
}

extension on int {
  bool get isOk => this >= 200 && this < 300;
}
