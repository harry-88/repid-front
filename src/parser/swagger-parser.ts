import SwaggerParser from '@apidevtools/swagger-parser';
import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs-extra';
import * as path from 'path';

export class SwaggerParserService {
    async parseSchema(source: string): Promise<any> {
        try {
            // Check if it's a URL or local file
            const isUrl = source.startsWith('http://') || source.startsWith('https://');

            if (isUrl) {
                console.log(chalk.gray(`Fetching schema from ${source}...`));
                // Fetch the schema first to handle CORS issues
                const response = await axios.get(source);
                const schema = response.data;

                // Try strict validation first
                try {
                    await SwaggerParser.validate(schema);
                    const dereferencedApi = await SwaggerParser.dereference(schema);
                    return dereferencedApi;
                } catch (validationError: any) {
                    // If validation fails, try lenient mode (dereference only)
                    console.log(chalk.yellow('\n⚠️  Schema validation failed. Attempting lenient mode...'));
                    console.log(chalk.gray(`   Reason: ${validationError.message.split('\n')[0]}`));

                    try {
                        // Use dereference without validation - it's more lenient
                        const dereferencedApi = await SwaggerParser.dereference(schema);
                        console.log(chalk.green('✓ Schema processed in lenient mode. Code generation will continue.\n'));
                        return dereferencedApi;
                    } catch (dereferenceError: any) {
                        throw new Error(`Schema is too invalid to process: ${dereferenceError.message}`);
                    }
                }
            } else {
                // Local file
                const absolutePath = path.resolve(process.cwd(), source);

                if (!await fs.pathExists(absolutePath)) {
                    throw new Error(`File not found: ${absolutePath}`);
                }

                console.log(chalk.gray(`Parsing local schema from ${absolutePath}...`));

                // Try strict validation first
                try {
                    await SwaggerParser.validate(absolutePath);
                    const dereferencedApi = await SwaggerParser.dereference(absolutePath);
                    return dereferencedApi;
                } catch (validationError: any) {
                    // If validation fails, try lenient mode (dereference only)
                    console.log(chalk.yellow('\n⚠️  Schema validation failed. Attempting lenient mode...'));
                    console.log(chalk.gray(`   Reason: ${validationError.message.split('\n')[0]}`));

                    try {
                        const dereferencedApi = await SwaggerParser.dereference(absolutePath);
                        console.log(chalk.green('✓ Schema processed in lenient mode. Code generation will continue.\n'));
                        return dereferencedApi;
                    } catch (dereferenceError: any) {
                        throw new Error(`Schema is too invalid to process: ${dereferenceError.message}`);
                    }
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch schema from URL: ${error.message}`);
            }

            if (error instanceof Error) {
                throw new Error(`Failed to parse Swagger schema: ${error.message}`);
            }

            throw new Error('Failed to parse Swagger schema: Unknown error');
        }
    }

    validateVersion(api: any): void {
        const version = (api as any).openapi || (api as any).swagger;

        if (!version) {
            throw new Error('Invalid schema: Missing OpenAPI/Swagger version');
        }

        // Support both OpenAPI 3.x and Swagger 2.0
        if (!version.startsWith('3.') && !version.startsWith('2.')) {
            throw new Error(
                `Unsupported OpenAPI/Swagger version: ${version}. ` +
                `Supported versions: OpenAPI 3.x and Swagger 2.0`
            );
        }

        if (version.startsWith('2.')) {
            console.log(chalk.yellow('⚠️  Warning: Swagger 2.0 detected. Some features may be limited. Consider upgrading to OpenAPI 3.x'));
        }
    }

    extractTags(api: any): string[] {
        const tags = new Set<string>();

        if ('paths' in api && api.paths) {
            Object.values(api.paths).forEach((pathItem: any) => {
                if (!pathItem) return;

                ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
                    const operation = pathItem[method];
                    if (operation && operation.tags) {
                        operation.tags.forEach((tag: string) => tags.add(tag));
                    }
                });
            });
        }

        return Array.from(tags).sort();
    }
}
