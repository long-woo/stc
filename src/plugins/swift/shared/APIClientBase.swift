import Foundation

/// A JSON value used when an OpenAPI schema does not provide a concrete type.
public enum JSONValue: Codable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported JSON value"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .string(let value):
            try container.encode(value)
        case .number(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

/// The response type used for endpoints without a response body.
public struct EmptyResponse: Codable, Sendable {
    public init() {}
}

/// A file value used by generated multipart form methods.
public struct APIFile: Codable, Sendable {
    public let data: Data
    public let filename: String
    public let mimeType: String

    public init(
        data: Data,
        filename: String = "file",
        mimeType: String = "application/octet-stream"
    ) {
        self.data = data
        self.filename = filename
        self.mimeType = mimeType
    }
}

/// Converts values used in paths, query strings, headers, and forms to their wire representation.
public enum APIParameterEncoder {
    public static func string(from value: Any) -> String {
        if let rawRepresentable = value as? any RawRepresentable {
            return String(describing: rawRepresentable.rawValue)
        }
        if let value = value as? Bool {
            return value ? "true" : "false"
        }

        return String(describing: value)
    }
}

/// Base settings shared by all generated requests.
public struct APICreateConfig {
    public let baseURL: String
    public let connectTimeout: TimeInterval
    public let receiveTimeout: TimeInterval
    public let defaultHeaders: [String: String]
    public let onError: ((String) -> Void)?
    public let onLogin: (() -> Void)?

    public init(
        baseURL: String,
        connectTimeout: TimeInterval = 5,
        receiveTimeout: TimeInterval = 30,
        defaultHeaders: [String: String] = [:],
        onError: ((String) -> Void)? = nil,
        onLogin: (() -> Void)? = nil
    ) {
        self.baseURL = baseURL
        self.connectTimeout = connectTimeout
        self.receiveTimeout = receiveTimeout
        self.defaultHeaders = defaultHeaders
        self.onError = onError
        self.onLogin = onLogin
    }
}

/// Settings for one generated API request.
public struct APIClientConfig {
    public let baseURL: String?
    public let url: String
    public let method: String
    public let query: [String: Any]
    public let headers: [String: String]
    public let body: Any?
    public let formData: [String: Any]
    public let timeout: TimeInterval?

    public init(
        baseURL: String? = nil,
        url: String,
        method: String,
        query: [String: Any] = [:],
        headers: [String: String] = [:],
        body: Any? = nil,
        formData: [String: Any] = [:],
        timeout: TimeInterval? = nil
    ) {
        self.baseURL = baseURL
        self.url = url
        self.method = method
        self.query = query
        self.headers = headers
        self.body = body
        self.formData = formData
        self.timeout = timeout
    }
}

public enum APIClientError: LocalizedError {
    case invalidURL(String)
    case invalidBody
    case httpStatus(Int, Data)

    public var errorDescription: String? {
        switch self {
        case .invalidURL(let value):
            return "Invalid URL: \(value)"
        case .invalidBody:
            return "The request body is not Encodable"
        case .httpStatus(let status, _):
            return "The server returned HTTP \(status)"
        }
    }
}

extension String {
    func parsePathParams(_ pathParams: [String: String]) -> String {
        pathParams.reduce(self) { result, item in
            let encoded = item.value.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/"))
            ) ?? item.value

            return result
                .replacingOccurrences(of: "{\(item.key)}", with: encoded)
                .replacingOccurrences(of: ":\(item.key)", with: encoded)
        }
    }
}
