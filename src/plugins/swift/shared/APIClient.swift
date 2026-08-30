import Foundation
import Alamofire

/// An Alamofire-backed HTTP client used by generated Swift APIs.
public final class APIClient: @unchecked Sendable {
    public static let shared = APIClient()

    private let lock = NSLock()
    private var session: Session
    private var baseURL = ""
    private var defaultHeaders: [String: String] = [:]
    private var onError: ((String) -> Void)?
    private var onLogin: (() -> Void)?

    private init() {
        session = Session(configuration: .default)
    }

    public func configure(_ config: APICreateConfig) {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = config.connectTimeout
        configuration.timeoutIntervalForResource = config.receiveTimeout

        lock.lock()
        session = Session(configuration: configuration)
        baseURL = config.baseURL
        defaultHeaders = config.defaultHeaders
        onError = config.onError
        onLogin = config.onLogin
        lock.unlock()
    }

    public func request<T: Decodable>(
        _ config: APIClientConfig,
        type: T.Type
    ) async throws -> T {
        let state = currentState()
        let rawURL = resolvedURL(baseURL: config.baseURL ?? state.baseURL, path: config.url)
        guard var components = URLComponents(string: rawURL) else {
            throw APIClientError.invalidURL(rawURL)
        }

        let generatedQuery = queryItems(from: config.query)
        if !generatedQuery.isEmpty {
            components.queryItems = (components.queryItems ?? []) + generatedQuery
        }
        guard let url = components.url else {
            throw APIClientError.invalidURL(rawURL)
        }

        let method = HTTPMethod(rawValue: config.method.uppercased())
        let headerValues = state.defaultHeaders.merging(config.headers) { _, requestValue in
            requestValue
        }
        let headers = HTTPHeaders(headerValues)
        let dataRequest: DataRequest

        if !config.formData.isEmpty {
            dataRequest = state.session.upload(
                multipartFormData: { multipart in
                    appendMultipart(config.formData, to: multipart)
                },
                to: url,
                method: method,
                headers: headers,
                requestModifier: { request in
                    if let timeout = config.timeout {
                        request.timeoutInterval = timeout
                    }
                }
            )
        } else {
            var request = URLRequest(url: url)
            request.httpMethod = config.method.uppercased()
            for (name, value) in headerValues {
                request.setValue(value, forHTTPHeaderField: name)
            }
            if let timeout = config.timeout {
                request.timeoutInterval = timeout
            }
            if let body = config.body {
                request.setValue(
                    request.value(forHTTPHeaderField: "Content-Type") ?? "application/json",
                    forHTTPHeaderField: "Content-Type"
                )
                request.httpBody = try encodeBody(body)
            }
            dataRequest = state.session.request(request)
        }

        let response = await dataRequest.serializingData(
            emptyResponseCodes: Set(200...299)
        ).response
        let responseData = response.data ?? Data()

        if response.response?.statusCode == 401 {
            state.onLogin?()
        }
        if let statusCode = response.response?.statusCode,
           !(200...299).contains(statusCode) {
            let error = APIClientError.httpStatus(statusCode, responseData)
            state.onError?(serverErrorMessage(from: responseData) ?? error.localizedDescription)
            throw error
        }

        switch response.result {
        case .success(let data):
            if data.isEmpty {
                if T.self == EmptyResponse.self {
                    return EmptyResponse() as! T
                }
                if T.self == JSONValue.self {
                    return JSONValue.null as! T
                }
            }

            do {
                return try JSONDecoder().decode(T.self, from: data)
            } catch {
                state.onError?(error.localizedDescription)
                throw error
            }
        case .failure(let error):
            state.onError?(error.localizedDescription)
            throw error
        }
    }

    private func currentState() -> (
        session: Session,
        baseURL: String,
        defaultHeaders: [String: String],
        onError: ((String) -> Void)?,
        onLogin: (() -> Void)?
    ) {
        lock.lock()
        defer { lock.unlock() }

        return (session, baseURL, defaultHeaders, onError, onLogin)
    }

    private func queryItems(from values: [String: Any]) -> [URLQueryItem] {
        values.sorted(by: { $0.key < $1.key }).flatMap { key, value in
            let mirror = Mirror(reflecting: value)
            if mirror.displayStyle == .collection || mirror.displayStyle == .set {
                return mirror.children.map {
                    URLQueryItem(name: key, value: APIParameterEncoder.string(from: $0.value))
                }
            }

            return [URLQueryItem(name: key, value: APIParameterEncoder.string(from: value))]
        }
    }

    private func resolvedURL(baseURL: String, path: String) -> String {
        if URL(string: path)?.scheme != nil {
            return path
        }
        if baseURL.isEmpty {
            return path
        }

        return baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            + "/"
            + path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private func encodeBody(_ value: Any) throws -> Data {
        if let data = value as? Data {
            return data
        }
        guard let encodable = value as? any Encodable else {
            throw APIClientError.invalidBody
        }

        return try JSONEncoder().encode(AnyEncodable(encodable))
    }

    private func serverErrorMessage(from data: Data) -> String? {
        if let error = try? JSONDecoder().decode(APIError.self, from: data) {
            return error.message
        }
        return String(data: data, encoding: .utf8)
    }
}

private func appendMultipart(
    _ values: [String: Any],
    to multipart: MultipartFormData
) {
    for (name, value) in values.sorted(by: { $0.key < $1.key }) {
        let mirror = Mirror(reflecting: value)
        if mirror.displayStyle == .collection || mirror.displayStyle == .set {
            for item in mirror.children {
                appendMultipartValue(item.value, name: name, to: multipart)
            }
        } else {
            appendMultipartValue(value, name: name, to: multipart)
        }
    }
}

private func appendMultipartValue(
    _ value: Any,
    name: String,
    to multipart: MultipartFormData
) {
    if let file = value as? APIFile {
        multipart.append(
            file.data,
            withName: name,
            fileName: file.filename,
            mimeType: file.mimeType
        )
    } else if let data = value as? Data {
        multipart.append(
            data,
            withName: name,
            fileName: "file",
            mimeType: "application/octet-stream"
        )
    } else {
        multipart.append(
            Data(APIParameterEncoder.string(from: value).utf8),
            withName: name
        )
    }
}

private struct AnyEncodable: Encodable {
    private let encodeValue: (Encoder) throws -> Void

    init(_ value: any Encodable) {
        encodeValue = value.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeValue(encoder)
    }
}

private struct APIError: Codable {
    let message: String
}
