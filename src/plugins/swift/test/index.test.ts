import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { expandGlob } from "@std/fs";
import { start } from "../../../app.ts";

const spec = {
  openapi: "3.0.0",
  info: { title: "Swift plugin", version: "1.0.0" },
  paths: {
    "/pets/{pet-id}": {
      post: {
        operationId: "updatePet",
        tags: ["pet"],
        parameters: [
          {
            name: "pet-id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "include-history",
            in: "query",
            required: false,
            schema: { type: "boolean" },
          },
          {
            name: "limit",
            in: "query",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "X-Trace-ID",
            in: "header",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Pet" },
            },
          },
        },
        responses: {
          "200": {
            description: "updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
        },
      },
    },
    "/uploads": {
      post: {
        operationId: "uploadAsset",
        tags: ["upload"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "204": { description: "uploaded" } },
      },
    },
  },
  components: {
    schemas: {
      Status: { type: "integer", enum: [0, 1] },
      Mode: { type: "string", enum: ["default", "read-only"] },
      NumericString: { type: "string", enum: ["0", "1"] },
      Pet: {
        type: "object",
        required: ["name", "default"],
        properties: {
          name: { type: "string" },
          default: { type: "boolean" },
          status: { $ref: "#/components/schemas/Status" },
          metadata: { type: "object", additionalProperties: true },
        },
      },
    },
  },
};

const compileGeneratedSwift = async (outDir: string) => {
  const swiftFiles: string[] = [];
  for await (const file of expandGlob(`${outDir}/**/*.swift`)) {
    swiftFiles.push(file.path);
  }

  const alamofireStubPath = `${outDir}/AlamofireStub.swift`;
  const alamofireModulePath = `${outDir}/Alamofire.swiftmodule`;
  await Deno.writeTextFile(
    alamofireStubPath,
    `
import Foundation

#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct HTTPMethod {
    public init(rawValue: String) {}
}

public struct HTTPHeaders {
    public init(_ values: [String: String]) {}
}

public struct AFError: Error {}

public struct AFDataResponse<Value> {
    public let data: Data?
    public let response: HTTPURLResponse?
    public let result: Result<Value, AFError>
}

public struct DataTask<Value> {
    public var response: AFDataResponse<Value> {
        get async { fatalError("compile-only stub") }
    }
}

public class DataRequest {
    public func serializingData(
        emptyResponseCodes: Set<Int>
    ) -> DataTask<Data> {
        fatalError("compile-only stub")
    }
}

public final class MultipartFormData {
    public func append(
        _ data: Data,
        withName name: String,
        fileName: String? = nil,
        mimeType: String? = nil
    ) {}
}

public final class Session {
    public init(configuration: URLSessionConfiguration) {}

    public func request(_ request: URLRequest) -> DataRequest {
        fatalError("compile-only stub")
    }

    public func upload(
        multipartFormData: (MultipartFormData) -> Void,
        to url: URL,
        method: HTTPMethod,
        headers: HTTPHeaders,
        requestModifier: ((inout URLRequest) throws -> Void)? = nil
    ) -> DataRequest {
        fatalError("compile-only stub")
    }
}
`,
  );

  const moduleCache = `${outDir}/module-cache`;
  await Deno.mkdir(moduleCache, { recursive: true });

  try {
    const buildStub = new Deno.Command("swiftc", {
      args: [
        "-emit-module",
        "-module-name",
        "Alamofire",
        "-module-cache-path",
        moduleCache,
        "-o",
        alamofireModulePath,
        alamofireStubPath,
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const stubResult = await buildStub.output();
    assertEquals(
      stubResult.code,
      0,
      new TextDecoder().decode(stubResult.stderr),
    );

    const command = new Deno.Command("swiftc", {
      args: [
        "-typecheck",
        "-I",
        outDir,
        "-module-cache-path",
        moduleCache,
        ...swiftFiles.sort(),
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const result = await command.output();
    const errorOutput = new TextDecoder().decode(result.stderr);
    assertEquals(result.code, 0, errorOutput);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn("swiftc is unavailable; skipped Swift type checking");
      return;
    }
    throw error;
  }
};

Deno.test("Swift plugin generates type-safe Alamofire client code", async () => {
  const tempDir = await Deno.makeTempDir();
  const specFile = `${tempDir}/openapi.json`;
  const outDir = `${tempDir}/out`;

  try {
    await Deno.writeTextFile(specFile, JSON.stringify(spec));
    await start({
      url: specFile,
      outDir,
      lang: "swift",
      shared: true,
      clean: true,
      conjunction: "By",
      actionIndex: -1,
    });

    const models = await Deno.readTextFile(`${outDir}/Models.swift`);
    const petApi = await Deno.readTextFile(`${outDir}/pet.swift`);
    const uploadApi = await Deno.readTextFile(`${outDir}/upload.swift`);
    const runtime = await Deno.readTextFile(
      `${outDir}/shared/alamofire/APIClient.swift`,
    );

    assertStringIncludes(models, "public enum Status: Int, Codable");
    assertStringIncludes(models, "case value0 = 0");
    assertStringIncludes(models, "public enum Mode: String, Codable");
    assertStringIncludes(models, 'case `default` = "default"');
    assertStringIncludes(models, "public enum NumericString: String, Codable");
    assertStringIncludes(models, 'case _0 = "0"');
    assertStringIncludes(models, "public let `default`: Bool");
    assertStringIncludes(models, "public init(");
    assertStringIncludes(petApi, 'queryParameters["include-history"]');
    assertStringIncludes(petApi, 'headerParameters["X-Trace-ID"]');
    assertStringIncludes(petApi, "body: requestBody");
    assertStringIncludes(uploadApi, 'formParameters["file"]');
    assertStringIncludes(uploadApi, "async throws -> EmptyResponse");
    assertFalse(petApi.includes("import Models"));
    assertFalse(petApi.includes("import APIClient"));
    assertStringIncludes(runtime, "#if canImport(FoundationNetworking)");
    assertStringIncludes(runtime, "import Alamofire");
    assertStringIncludes(runtime, "Session");
    assertStringIncludes(runtime, "multipartFormData:");

    await compileGeneratedSwift(outDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
