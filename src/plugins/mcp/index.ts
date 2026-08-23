import type {
  IPlugin,
  IPluginSetup,
  IPluginTransform,
} from "../typeDeclaration.ts";
import type {
  IDefinitionVirtualProperty,
  IPathVirtualParameter,
  parameterCategory,
} from "../../swagger.ts";

interface JsonSchema {
  type: string | string[];
  description?: string;
  enum?: (string | number)[];
  default?: string | number | boolean;
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
}

interface McpHttpParameter {
  in: parameterCategory;
  name: string;
  input: string;
  required: boolean;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  "x-stc-http": {
    method: string;
    path: string;
    parameters: McpHttpParameter[];
  };
}

type DefinitionMap = Map<
  string,
  IDefinitionVirtualProperty | IDefinitionVirtualProperty[]
>;

const PARAMETER_CATEGORIES: Array<keyof IPathVirtualParameter> = [
  "path",
  "query",
  "body",
  "formData",
  "header",
];

const sanitizeToolName = (name: string) => {
  const normalized = name
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "openapi-tool";
};

const schemaType = (property: IDefinitionVirtualProperty): string => {
  const type = Array.isArray(property.type) ? property.type[0] : property.type;

  if (property.typeX === "array" || type === "array") return "array";
  if (type === "integer") return "integer";
  if (type === "number") return "number";
  if (type === "boolean" || type === "bool") return "boolean";
  if (type === "file") return "string";
  if (type === "object" || property.properties?.length || property.ref) {
    return "object";
  }

  return "string";
};

const definitionToSchema = (
  name: string,
  definitions: DefinitionMap,
  visitedRefs: Set<string>,
): JsonSchema | undefined => {
  const definition = definitions.get(name);
  if (!definition || visitedRefs.has(name)) return undefined;

  visitedRefs.add(name);
  const schema = Array.isArray(definition)
    ? propertiesToSchema(definition, definitions, visitedRefs)
    : toJsonSchema(definition, definitions, visitedRefs);
  visitedRefs.delete(name);

  return schema;
};

const propertiesToSchema = (
  properties: IDefinitionVirtualProperty[],
  definitions: DefinitionMap,
  visitedRefs: Set<string>,
): JsonSchema => {
  const schema: JsonSchema = { type: "object", properties: {} };
  const required: string[] = [];

  properties.forEach((child) => {
    const name = child.originalName ?? child.name;
    schema.properties![name] = toJsonSchema(child, definitions, visitedRefs);
    if (child.required) required.push(name);
  });

  if (required.length) schema.required = required;
  return schema;
};

const toJsonSchema = (
  property: IDefinitionVirtualProperty,
  definitions: DefinitionMap,
  visitedRefs = new Set<string>(),
): JsonSchema => {
  const type = schemaType(property);
  const schema: JsonSchema = { type };

  if (property.description) schema.description = property.description;
  if (property.enumOption?.length) schema.enum = property.enumOption;
  if (property.default !== undefined) schema.default = property.default;
  if (property.format) schema.format = property.format;
  if (type === "string" && property.type === "file") schema.format = "binary";
  if (property.nullable) schema.type = [type, "null"];

  if (type === "array") {
    const item: IDefinitionVirtualProperty = property.items ?? {
      name: "item",
      type: property.typeX ?? property.ref ?? "string",
      ref: property.ref,
    };
    schema.items = property.ref
      ? definitionToSchema(property.ref, definitions, visitedRefs) ??
        toJsonSchema(item, definitions, visitedRefs)
      : toJsonSchema(item, definitions, visitedRefs);
  }

  if (type === "object") {
    const resolved = property.properties?.length
      ? propertiesToSchema(property.properties, definitions, visitedRefs)
      : definitionToSchema(property.ref ?? "", definitions, visitedRefs);

    if (resolved) Object.assign(schema, resolved);
    if (property.additionalRef) {
      schema.additionalProperties = definitionToSchema(
        property.additionalRef,
        definitions,
        visitedRefs,
      ) ?? { type: "object" };
    }
  }

  return schema;
};

const uniqueInputName = (
  preferred: string,
  category: parameterCategory,
  usedNames: Set<string>,
) => {
  let name = preferred;
  let index = 2;

  if (usedNames.has(name)) name = `${category}_${preferred}`;
  const baseName = name;
  while (usedNames.has(name)) {
    name = `${baseName}_${index}`;
    index += 1;
  }

  usedNames.add(name);
  return name;
};

const createInput = (
  data: { parameters: IPathVirtualParameter },
  definitions: DefinitionMap,
): { schema: JsonSchema; parameters: McpHttpParameter[] } => {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const parameters: McpHttpParameter[] = [];
  const usedNames = new Set<string>();

  PARAMETER_CATEGORIES.forEach((category) => {
    data.parameters[category].forEach((parameter) => {
      const parameterName = parameter.originalName ?? parameter.name;
      const preferredName = category === "body" ? "body" : parameterName;
      const inputName = uniqueInputName(preferredName, category, usedNames);

      properties[inputName] = toJsonSchema(parameter, definitions);
      if (parameter.required) required.push(inputName);
      parameters.push({
        in: category,
        name: category === "body" ? "body" : parameterName,
        input: inputName,
        required: Boolean(parameter.required),
      });
    });
  });

  const schema: JsonSchema = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required.length) schema.required = required;
  return { schema, parameters };
};

const getToolName = (key: string, usedNames: Set<string>) => {
  const rawName = key.slice(key.indexOf("@") + 1);
  const baseName = sanitizeToolName(rawName);
  let name = baseName;
  let index = 2;

  while (usedNames.has(name)) {
    name = `${baseName}-${index}`;
    index += 1;
  }

  usedNames.add(name);
  return name;
};

export const McpPlugin: IPlugin = {
  name: "stc:McpPlugin",
  lang: "mcp",

  setup(): IPluginSetup {
    return {
      unknownType: "string",
      typeMap() {
        return {};
      },
      template: {
        enum: "mcp",
        definitionHeader: "mcp",
        definitionBody: "mcp",
        definitionFooter: "mcp",
        actionImport: "mcp",
        actionMethod: "mcp",
      },
      langDirectoryName: "mcp",
    };
  },

  onTransform(definitions, action): IPluginTransform {
    const usedNames = new Set<string>();
    const tools: McpTool[] = [];

    action.forEach((data, key) => {
      const input = createInput(data, definitions);
      tools.push({
        name: getToolName(key, usedNames),
        description: data.summary || data.description ||
          `${data.method} ${data.url}`,
        inputSchema: input.schema,
        "x-stc-http": {
          method: data.method.toUpperCase(),
          path: data.url,
          parameters: input.parameters,
        },
      });
    });

    return {
      definition: {
        filename: "mcp-tools.json",
        content: JSON.stringify({ tools }, null, 2) + "\n",
        banner: false,
      },
    };
  },
};
