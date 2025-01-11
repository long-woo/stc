import Foundation

/// A configuration object that defines the base settings for the API client.
public struct APICreateConfig {
    /// The base URL for all API requests.
    let baseURL: String
    
    /// The maximum amount of time (in seconds) to wait for a connection to be established.
    let connectTimeout: TimeInterval
    
    /// The maximum amount of time (in seconds) to wait for the request to complete.
    let receiveTimeout: TimeInterval
    
    /// A closure that will be called when an error occurs.
    /// - Parameter message: The error message describing what went wrong.
    let onError: ((String) -> Void)?
    
    /// A closure that will be called when authentication is required.
    let onLogin: (() -> Void)?
    
    /// Creates a new API client configuration.
    /// - Parameters:
    ///   - baseURL: The base URL for all API requests.
    ///   - connectTimeout: The connection timeout in seconds. Defaults to 5 seconds.
    ///   - receiveTimeout: The receive timeout in seconds. Defaults to 3 seconds.
    ///   - onError: A closure to handle errors. Defaults to nil.
    ///   - onLogin: A closure to handle authentication. Defaults to nil.
    public init(
        baseURL: String,
        connectTimeout: TimeInterval = 5,
        receiveTimeout: TimeInterval = 3,
        onError: ((String) -> Void)? = nil,
        onLogin: (() -> Void)? = nil
    ) {
        self.baseURL = baseURL
        self.connectTimeout = connectTimeout
        self.receiveTimeout = receiveTimeout
        self.onError = onError
        self.onLogin = onLogin
    }
}

/// A configuration object that defines the settings for a single API request.
public struct APIClientConfig {
    /// Optional base URL that overrides the default base URL.
    let baseURL: String?
    
    /// The endpoint path for the request.
    let url: String
    
    /// The HTTP method for the request.
    let method: String
    
    /// Optional parameters to be included in the request.
    let params: [String: Any]?
    
    /// Optional timeout that overrides the default timeout.
    let timeout: TimeInterval?
    
    /// Creates a new API request configuration.
    /// - Parameters:
    ///   - baseURL: Optional base URL that overrides the default base URL.
    ///   - url: The endpoint path for the request.
    ///   - method: The HTTP method for the request.
    ///   - params: Optional parameters to be included in the request.
    ///   - timeout: Optional timeout that overrides the default timeout.
    public init(
        baseURL: String? = nil,
        url: String,
        method: String,
        params: [String: Any]? = nil,
        timeout: TimeInterval? = nil
    ) {
        self.baseURL = baseURL
        self.url = url
        self.method = method
        self.params = params
        self.timeout = timeout
    }
}

/// Extension to provide URL path parameter parsing functionality.
extension String {
    /// Replaces path parameters in the URL string with their corresponding values.
    /// - Parameter pathParams: A dictionary of path parameter names and their values.
    /// - Returns: A URL string with all path parameters replaced with their values.
    func parsePathParams(_ pathParams: [String: String]) -> String {
        guard !pathParams.isEmpty else { return self }
        
        var result = self
        for (key, value) in pathParams {
            let pattern = "\\{" + key + "\\}|:" + key
            result = result.replacingOccurrences(
                of: pattern,
                with: value,
                options: .regularExpression
            )
        }
        return result
    }
}

/// Extension to provide HTTP status code validation.
extension Int {
    /// Indicates whether the status code represents a successful response (2xx).
    var isOk: Bool {
        return (200...299).contains(self)
    }
}
