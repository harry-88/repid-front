export type LibraryChoice = 'zustand' | 'redux-toolkit' | 'axios-hooks' | 'fetch-api';
export type LanguageChoice = 'typescript' | 'javascript';

export interface WizardAnswers {
    schemaSource: string;
    library: LibraryChoice;
    language: LanguageChoice;
    outputDirectory: string;
    selectionMode: 'all' | 'selective';
    selectedTags?: string[];
}

export interface EndpointMetadata {
    operationId: string;
    functionName: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    summary?: string;
    description?: string;
    parameters: ParameterMetadata[];
    requestBody?: RequestBodyMetadata;
    responses: ResponseMetadata[];
    tags: string[];
}

export interface ParameterMetadata {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required: boolean;
    type: string;
    description?: string;
}

export interface RequestBodyMetadata {
    required: boolean;
    contentType: string;
    schema: string;
}

export interface ResponseMetadata {
    statusCode: string;
    description?: string;
    schema?: string;
}

export interface ModuleMetadata {
    moduleName: string;
    tag: string;
    endpoints: EndpointMetadata[];
    schemas: SchemaMetadata[];
}

export interface SchemaMetadata {
    name: string;
    properties: Record<string, any>;
    required?: string[];
}

export interface GenerationContext {
    answers: WizardAnswers;
    modules: ModuleMetadata[];
    schemas: Map<string, SchemaMetadata>;
}
