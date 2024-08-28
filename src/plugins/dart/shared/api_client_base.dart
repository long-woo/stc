class ApiCreateConfig {
  /// The base URL of the API endpoint.
  String baseURL;

  /// The timeout in milliseconds for the connection.
  Duration connectTimeout = const Duration(seconds: 5);

  /// The timeout in milliseconds for the response.
  Duration receiveTimeout = const Duration(seconds: 3);

  /// The function to call when an error occurs.
  Function(String)? onError;

  /// The function to call when a login is required.
  Function()? onLogin;

  ApiCreateConfig({required this.baseURL, this.onError, this.onLogin});
}

class ApiClientConfig {
  /// The base URL of the API endpoint.
  String? baseURL;

  /// The URL of the API endpoint.
  String url;

  /// The HTTP method to use.
  String method;

  /// The parameters to send with the request.
  Map<String, dynamic>? params;

  /// The timeout in milliseconds for the request.
  Duration? timeout;

  ApiClientConfig(
      {this.baseURL,
      required this.url,
      required this.method,
      this.params,
      this.timeout});
}
