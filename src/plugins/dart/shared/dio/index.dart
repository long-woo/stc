import 'package:dio/dio.dart';

import '../apiClientBase.dart';

var dio;

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
void createDio(BaseOptions options) {
  dio = Dio(BaseOptions(
      baseUrl: options.baseUrl,
      connectTimeout: options.connectTimeout ?? Duration(seconds: 5),
      receiveTimeout: options.receiveTimeout ?? Duration(seconds: 3)));

  addInterceptor();
}

/// request 方法
Future<T> request<T>(ApiClientConfig instance) async {
  Options requestOptions = options ?? Options();
  requestOptions.method = method;
  return dio.request<T>(url, queryParameters: params, options: requestOptions);
}

Future<T> request<T>(ApiClientConfig instance) async {
  try {
    final response = await dio.request(
      instance.url,
      queryParameters: instance.params?.query,
      data: instance.params?.body,
      options: Options(
        method: instance.method,
      ),
    );

    if (response.statusCode == 401) {
      instance.onLogin?.call();
    }

    return response.data as T;
  } on DioError catch (e) {
    if (e.response != null && !e.response!.statusCode!.isOk) {
      instance.onError?.call(e.response!.statusMessage);
    }
    rethrow; // Or handle the error as you see fit
  }
}

extension on int {
  bool get isOk => this >= 200 && this < 300;
}
