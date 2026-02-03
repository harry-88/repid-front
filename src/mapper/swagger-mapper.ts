
import {
    EndpointMetadata,
    ModuleMetadata,
    SchemaMetadata,
    ParameterMetadata,
    RequestBodyMetadata,
    ResponseMetadata
} from '../types.js';

export class SwaggerMapper {
    private schemas: Map<string, SchemaMetadata> = new Map();

    mapToModules(api: any, selectedTags?: string[]): ModuleMetadata[] {
        this.extractSchemas(api);

        const moduleMap = new Map<string, EndpointMetadata[]>();

        if ('paths' in api && api.paths) {
            Object.entries(api.paths).forEach(([path, pathItem]) => {
                if (!pathItem) return;

                ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
                    const operation = (pathItem as any)[method];
                    if (!operation) return;

                    const endpoint = this.mapEndpoint(path, method.toUpperCase() as any, operation);

                    // Determine which tag(s) this endpoint belongs to
                    const tags = endpoint.tags.length > 0
                        ? endpoint.tags
                        : [this.getTagFromPath(path)];

                    tags.forEach(tag => {
                        // Skip if selective mode and tag not selected
                        if (selectedTags && !selectedTags.includes(tag)) {
                            return;
                        }

                        if (!moduleMap.has(tag)) {
                            moduleMap.set(tag, []);
                        }
                        moduleMap.get(tag)!.push(endpoint);
                    });
                });
            });
        }

        // Convert map to array of modules
        const modules: ModuleMetadata[] = [];
        moduleMap.forEach((endpoints, tag) => {
            modules.push({
                moduleName: this.tagToModuleName(tag),
                tag,
                endpoints,
                schemas: this.getSchemasForModule(endpoints)
            });
        });

        return modules;
    }

    private mapEndpoint(
        path: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        operation: any
    ): EndpointMetadata {
        const functionName = this.pathToFunctionName(path, method);

        return {
            operationId: operation.operationId || functionName,
            functionName,
            method,
            path,
            summary: operation.summary,
            description: operation.description,
            parameters: this.mapParameters(operation.parameters || []),
            requestBody: this.mapRequestBody(operation.requestBody),
            responses: this.mapResponses(operation.responses || {}),
            tags: operation.tags || []
        };
    }

    private mapParameters(parameters: any[]): ParameterMetadata[] {
        return parameters.map(param => ({
            name: param.name,
            in: param.in,
            required: param.required || false,
            type: this.getTypeFromSchema(param.schema),
            description: param.description
        }));
    }

    private mapRequestBody(requestBody: any): RequestBodyMetadata | undefined {
        if (!requestBody) return undefined;

        const content = requestBody.content || {};
        const contentType = Object.keys(content)[0] || 'application/json';
        const schema = content[contentType]?.schema;

        return {
            required: requestBody.required || false,
            contentType,
            schema: schema ? this.getSchemaName(schema) : 'any'
        };
    }

    private mapResponses(responses: any): ResponseMetadata[] {
        return Object.entries(responses).map(([statusCode, response]: [string, any]) => ({
            statusCode,
            description: response.description,
            schema: this.getResponseSchema(response)
        }));
    }

    private extractSchemas(api: any): void {
        if ('components' in api && api.components?.schemas) {
            Object.entries(api.components.schemas).forEach(([name, schema]) => {
                this.schemas.set(name, {
                    name,
                    properties: (schema as any).properties || {},
                    required: (schema as any).required
                });
            });
        }

        // Also handle Swagger 2.0 definitions
        if ('definitions' in api && (api as any).definitions) {
            Object.entries((api as any).definitions).forEach(([name, schema]: [string, any]) => {
                this.schemas.set(name, {
                    name,
                    properties: schema.properties || {},
                    required: schema.required
                });
            });
        }
    }

    private getSchemaName(schema: any): string {
        if (schema.$ref) {
            return schema.$ref.split('/').pop() || 'any';
        }
        if (schema.type === 'array' && schema.items) {
            return `${this.getSchemaName(schema.items)}[]`;
        }
        return this.getTypeFromSchema(schema);
    }

    private getTypeFromSchema(schema: any): string {
        if (!schema) return 'any';

        if (schema.$ref) {
            return schema.$ref.split('/').pop() || 'any';
        }

        const typeMap: Record<string, string> = {
            string: 'string',
            number: 'number',
            integer: 'number',
            boolean: 'boolean',
            array: 'any[]',
            object: 'any'
        };

        return typeMap[schema.type] || 'any';
    }

    private getResponseSchema(response: any): string | undefined {
        if (!response.content) return undefined;

        const content = response.content['application/json'] ||
            response.content[Object.keys(response.content)[0]];

        if (!content?.schema) return undefined;

        return this.getSchemaName(content.schema);
    }

    private pathToFunctionName(path: string, method: string): string {
        // Convert /order-history/{id} to getOrderHistoryById
        const segments = path
            .split('/')
            .filter(s => s.length > 0)
            .map(segment => {
                if (segment.startsWith('{') && segment.endsWith('}')) {
                    // Parameter: {id} -> ById
                    const paramName = segment.slice(1, -1);
                    return 'By' + this.capitalize(this.toCamelCase(paramName));
                }
                return this.toCamelCase(segment);
            });

        const methodPrefix = method.toLowerCase();
        const functionName = segments.map(s => this.capitalize(s)).join('');

        return methodPrefix + functionName;
    }

    private tagToModuleName(tag: string): string {
        // Convert "User Management" to "UserManagement"
        return tag
            .split(/[\s-_]+/)
            .map(word => this.capitalize(word))
            .join('');
    }

    private getTagFromPath(path: string): string {
        // Extract first segment as tag: /users/123 -> users
        const segments = path.split('/').filter(s => s.length > 0);
        if (segments.length === 0) return 'Default';

        const firstSegment = segments[0].replace(/[{}]/g, '');
        return this.capitalize(firstSegment);
    }

    private getSchemasForModule(endpoints: EndpointMetadata[]): SchemaMetadata[] {
        const schemaNames = new Set<string>();

        endpoints.forEach(endpoint => {
            if (endpoint.requestBody?.schema) {
                const baseName = endpoint.requestBody.schema.replace('[]', '');
                if (this.schemas.has(baseName)) {
                    schemaNames.add(baseName);
                }
            }

            endpoint.responses.forEach(response => {
                if (response.schema) {
                    const baseName = response.schema.replace('[]', '');
                    if (this.schemas.has(baseName)) {
                        schemaNames.add(baseName);
                    }
                }
            });
        });

        return Array.from(schemaNames).map(name => this.schemas.get(name)!);
    }

    private toCamelCase(str: string): string {
        return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getSchemas(): Map<string, SchemaMetadata> {
        return this.schemas;
    }
}
