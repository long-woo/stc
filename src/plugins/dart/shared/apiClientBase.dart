class ApiClientConfig {
  /// The base URL of the API endpoint.
  String baseURL;

  /// The URL of the API endpoint.
  String url;

  /// The HTTP method to use.
  String method;

  /// The parameters to send with the request.
  Map<String, dynamic>? params;

  /// The timeout in milliseconds for the request.
  int timeout;

  /// The function to call when an error occurs.
  Function(String)? onError;

  /// The function to call when a login is required.
  Function()? onLogin;

  ApiClientConfig({
    required this.baseURL,
    required this.url,
    required this.method,
    this.params,
    required this.timeout,
    this.onError,
    this.onLogin,
  });
}
