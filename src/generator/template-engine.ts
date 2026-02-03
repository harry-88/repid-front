import Handlebars from 'handlebars';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ModuleMetadata, LibraryChoice, LanguageChoice } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateEngine {
    private templates: Map<LibraryChoice, HandlebarsTemplateDelegate> = new Map();

    constructor() {
        this.registerHelpers();
    }

    async loadTemplates(): Promise<void> {
        const templateDir = path.join(__dirname, '../templates');

        const templateFiles: Record<LibraryChoice, string> = {
            'zustand': 'zustand.hbs',
            'redux-toolkit': 'redux-toolkit.hbs',
            'axios-hooks': 'axios-hooks.hbs',
            'fetch-api': 'fetch-api.hbs'
        };

        for (const [library, filename] of Object.entries(templateFiles)) {
            const templatePath = path.join(templateDir, filename);
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            this.templates.set(library as LibraryChoice, Handlebars.compile(templateContent));
        }
    }

    private registerHelpers(): void {
        // Helper to get TypeScript type from schema property
        Handlebars.registerHelper('getTypeScriptType', function (property: any) {
            if (!property) return 'any';

            if (property.type === 'array') {
                const itemType = property.items ? Handlebars.helpers.getTypeScriptType(property.items) : 'any';
                return `${itemType}[]`;
            }

            const typeMap: Record<string, string> = {
                string: 'string',
                number: 'number',
                integer: 'number',
                boolean: 'boolean',
                object: 'any',
                array: 'any[]'
            };

            return typeMap[property.type] || 'any';
        });

        // Helper to get response type from responses array
        Handlebars.registerHelper('getResponseType', function (responses: any[]) {
            if (!responses || responses.length === 0) return 'any';

            // Find 200 or 201 response
            const successResponse = responses.find(r => r.statusCode === '200' || r.statusCode === '201');
            return successResponse?.schema || 'any';
        });

        // Helper to convert to lowercase
        Handlebars.registerHelper('toLowerCase', function (str: string) {
            return str.toLowerCase();
        });

        // Helper to convert to lowercase (for variable names)
        Handlebars.registerHelper('lowerCase', function (str: string) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        });

        // Helper to capitalize
        Handlebars.registerHelper('capitalize', function (str: string) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        });

        // Helper for equality check
        Handlebars.registerHelper('eq', function (a: any, b: any) {
            return a === b;
        });

        // Helper to lookup value in object
        Handlebars.registerHelper('lookup', function (obj: any, key: string) {
            if (!obj || !Array.isArray(obj)) return false;
            return obj.includes(key);
        });
    }

    async generateModule(
        module: ModuleMetadata,
        library: LibraryChoice,
        language: LanguageChoice
    ): Promise<string> {
        const template = this.templates.get(library);

        if (!template) {
            throw new Error(`Template not found for library: ${library}`);
        }

        let code = template(module);

        // If JavaScript, remove TypeScript-specific syntax
        if (language === 'javascript') {
            code = this.convertToJavaScript(code);
        }

        return code;
    }

    private convertToJavaScript(tsCode: string): string {
        // Remove type annotations and interfaces
        let jsCode = tsCode;

        // Remove interface definitions
        jsCode = jsCode.replace(/export interface \w+ \{[^}]+\}\n\n/g, '');

        // Remove type annotations from parameters
        jsCode = jsCode.replace(/(\w+):\s*[\w\[\]<>|]+/g, '$1');

        // Remove generic type parameters
        jsCode = jsCode.replace(/<[\w\[\]<>|, ]+>/g, '');

        // Remove type assertions
        jsCode = jsCode.replace(/as \w+/g, '');

        // Remove return type annotations
        jsCode = jsCode.replace(/\):\s*[\w\[\]<>|]+\s*=>/g, ') =>');

        return jsCode;
    }

    getFileExtension(language: LanguageChoice): string {
        return language === 'typescript' ? '.ts' : '.js';
    }

    getModuleFileName(moduleName: string, library: LibraryChoice, language: LanguageChoice): string {
        const ext = this.getFileExtension(language);

        switch (library) {
            case 'zustand':
                return `use${moduleName}Store${ext}`;
            case 'redux-toolkit':
                return `${moduleName.charAt(0).toLowerCase() + moduleName.slice(1)}Slice${ext}`;
            case 'axios-hooks':
            case 'fetch-api':
                return `use${moduleName}${ext}`;
            default:
                return `${moduleName}${ext}`;
        }
    }
}
