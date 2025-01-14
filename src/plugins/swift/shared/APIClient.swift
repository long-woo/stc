import Foundation
import Alamofire

/// A client for making API requests using Alamofire.
public class APIClient {
    /// The shared singleton instance of the API client.
    public static let shared = APIClient()
    
    private var session: Session!
    private var baseURL: String = ""
    private var onError: ((String) -> Void)?
    private var onLogin: (() -> Void)?
    
    private init() {}
    
    /// Configures the API client with the specified settings.
    /// - Parameter config: The configuration object containing the settings.
    public func configure(_ config: APICreateConfig) {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = config.connectTimeout
        configuration.timeoutIntervalForResource = config.receiveTimeout
        
        session = Session(configuration: configuration)
        baseURL = config.baseURL
        onError = config.onError
        onLogin = config.onLogin
        
        addInterceptors()
    }
    
    /// Adds request and response interceptors to the session.
    private func addInterceptors() {
        let interceptor = Interceptor(adapters: [], retriers: [], interceptors: [
            CustomRequestInterceptor(),
            CustomResponseInterceptor(onError: onError, onLogin: onLogin)
        ])
        session = session.session(interceptor: interceptor)
    }
    
    /// Makes an API request with the specified configuration.
    /// - Parameters:
    ///   - config: The configuration for this specific request.
    ///   - type: The expected type of the response data.
    /// - Returns: A decoded instance of the specified type.
    /// - Throws: An error if the request fails or the response cannot be decoded.
    public func request<T: Decodable>(
        _ config: APIClientConfig,
        type: T.Type
    ) async throws -> T {
        let url = (config.baseURL ?? baseURL) + config.url
        let method = HTTPMethod(rawValue: config.method)
        let parameters = config.params
        let encoding: ParameterEncoding = method == .get ? URLEncoding.default : JSONEncoding.default
        
        let request = session.request(
            url,
            method: method,
            parameters: parameters,
            encoding: encoding
        )
        
        if let timeout = config.timeout {
            request.authenticate(timeout: timeout)
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            request
                .validate()
                .responseDecodable(of: T.self) { response in
                    switch response.result {
                    case .success(let value):
                        continuation.resume(returning: value)
                    case .failure(let error):
                        if let data = response.data,
                           let errorResponse = try? JSONDecoder().decode(APIError.self, from: data) {
                            self.onError?(errorResponse.message)
                        } else {
                            self.onError?(error.localizedDescription)
                        }
                        continuation.resume(throwing: error)
                    }
                }
        }
    }
}

/// An interceptor that modifies outgoing requests.
class CustomRequestInterceptor: RequestInterceptor {
    /// Adapts the URL request before it is sent.
    /// - Parameters:
    ///   - urlRequest: The request to be modified.
    ///   - session: The session that created the request.
    ///   - completion: A closure that takes the modified request or an error.
    func adapt(_ urlRequest: URLRequest, for session: Session, completion: @escaping (Result<URLRequest, Error>) -> Void) {
        var urlRequest = urlRequest
        // Add common headers or other request processing logic here
        completion(.success(urlRequest))
    }
}

/// An interceptor that handles responses and errors.
class CustomResponseInterceptor: RequestInterceptor {
    private let onError: ((String) -> Void)?
    private let onLogin: (() -> Void)?
    
    /// Creates a new response interceptor.
    /// - Parameters:
    ///   - onError: A closure to handle errors.
    ///   - onLogin: A closure to handle authentication requirements.
    init(onError: ((String) -> Void)? = nil, onLogin: (() -> Void)? = nil) {
        self.onError = onError
        self.onLogin = onLogin
    }
    
    /// Determines whether a failed request should be retried.
    /// - Parameters:
    ///   - request: The request that failed.
    ///   - session: The session that created the request.
    ///   - error: The error that caused the failure.
    ///   - completion: A closure that takes the retry decision.
    func retry(_ request: Request, for session: Session, dueTo error: Error, completion: @escaping (RetryResult) -> Void) {
        if let response = request.task?.response as? HTTPURLResponse {
            switch response.statusCode {
            case 401:
                onLogin?()
            default:
                break
            }
        }
        completion(.doNotRetry)
    }
}

/// A model representing an API error response.
struct APIError: Codable {
    /// The error message describing what went wrong.
    let message: String
}
