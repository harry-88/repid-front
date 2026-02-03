import fs from 'fs-extra';
import * as path from 'path';
import prettier from 'prettier';
import { GenerationContext } from '../types.js';
import { TemplateEngine } from './template-engine.js';
import chalk from 'chalk';
import ora from 'ora';

export class CodeGenerator {
    private templateEngine: TemplateEngine;

    constructor() {
        this.templateEngine = new TemplateEngine();
    }

    async initialize(): Promise<void> {
        await this.templateEngine.loadTemplates();
    }

    async generate(context: GenerationContext): Promise<void> {
        const { answers, modules } = context;
        const outputDir = path.resolve(process.cwd(), answers.outputDirectory);

        // Create output directory
        await fs.ensureDir(outputDir);

        const spinner = ora('Generating modules...').start();

        try {
            // Generate each module
            for (const module of modules) {
                await this.generateModule(module, context);
            }

            // Generate index file
            await this.generateIndexFile(modules, context);

            // Generate types file (if TypeScript)
            if (answers.language === 'typescript') {
                await this.generateTypesFile(context);
            }

            // Generate README
            await this.generateReadme(context);

            spinner.succeed(chalk.green(`Successfully generated ${modules.length} module(s)!`));

            console.log(chalk.cyan('\n📁 Generated files:'));
            console.log(chalk.gray(`   ${outputDir}/`));

            modules.forEach(module => {
                const folderName = this.toKebabCase(module.moduleName);
                const fileName = this.templateEngine.getModuleFileName(
                    module.moduleName,
                    answers.library,
                    answers.language
                );
                console.log(chalk.gray(`   ├── ${folderName}/`));
                console.log(chalk.gray(`   │   └── ${fileName}`));
            });

            console.log(chalk.gray(`   ├── index${this.templateEngine.getFileExtension(answers.language)}`));

            if (answers.language === 'typescript') {
                console.log(chalk.gray(`   ├── types${this.templateEngine.getFileExtension(answers.language)}`));
            }

            console.log(chalk.gray(`   └── README.md`));

            console.log(chalk.green('\n✨ All done! Your API modules are ready to use.\n'));
        } catch (error) {
            spinner.fail(chalk.red('Failed to generate modules'));
            throw error;
        }
    }

    private async generateModule(module: any, context: GenerationContext): Promise<void> {
        const { answers } = context;
        const outputDir = path.resolve(process.cwd(), answers.outputDirectory);

        // Generate code from template
        let code = await this.templateEngine.generateModule(
            module,
            answers.library,
            answers.language
        );

        // Format with Prettier
        code = await this.formatCode(code, answers.language);

        // Write to file
        const fileName = this.templateEngine.getModuleFileName(
            module.moduleName,
            answers.library,
            answers.language
        );

        // Create module directory
        const folderName = this.toKebabCase(module.moduleName);
        const moduleDir = path.join(outputDir, folderName);
        await fs.ensureDir(moduleDir);

        const filePath = path.join(moduleDir, fileName);

        await fs.writeFile(filePath, code, 'utf-8');
    }

    private async generateIndexFile(modules: any[], context: GenerationContext): Promise<void> {
        const { answers } = context;
        const outputDir = path.resolve(process.cwd(), answers.outputDirectory);
        const ext = this.templateEngine.getFileExtension(answers.language);

        let indexContent = '// Auto-generated index file\n\n';

        modules.forEach(module => {
            const folderName = this.toKebabCase(module.moduleName);
            const fileName = this.templateEngine.getModuleFileName(
                module.moduleName,
                answers.library,
                answers.language
            ).replace(ext, '');

            const modulePath = `./${folderName}/${fileName}`;

            switch (answers.library) {
                case 'zustand':
                    indexContent += `export { use${module.moduleName}Store } from '${modulePath}';\n`;
                    break;
                case 'redux-toolkit':
                    indexContent += `export { default as ${module.moduleName.charAt(0).toLowerCase() + module.moduleName.slice(1)}Reducer } from '${modulePath}';\n`;
                    indexContent += `export * from '${modulePath}';\n`;
                    break;
                case 'axios-hooks':
                case 'fetch-api':
                    indexContent += `export * from '${modulePath}';\n`;
                    break;
            }
        });

        if (answers.language === 'typescript') {
            indexContent += `\nexport * from './types';\n`;
        }

        indexContent = await this.formatCode(indexContent, answers.language);
        await fs.writeFile(path.join(outputDir, `index${ext}`), indexContent, 'utf-8');
    }

    private async generateTypesFile(context: GenerationContext): Promise<void> {
        const { answers, schemas } = context;
        const outputDir = path.resolve(process.cwd(), answers.outputDirectory);
        const ext = this.templateEngine.getFileExtension(answers.language);

        let typesContent = '// Auto-generated type definitions\n\n';

        schemas.forEach((schema, name) => {
            typesContent += `export interface ${name} {\n`;

            Object.entries(schema.properties).forEach(([propName, propValue]: [string, any]) => {
                const isRequired = schema.required?.includes(propName);
                const optional = isRequired ? '' : '?';
                const type = this.getTypeScriptType(propValue);
                typesContent += `  ${propName}${optional}: ${type};\n`;
            });

            typesContent += '}\n\n';
        });

        typesContent = await this.formatCode(typesContent, answers.language);
        await fs.writeFile(path.join(outputDir, `types${ext}`), typesContent, 'utf-8');
    }

    private async generateReadme(context: GenerationContext): Promise<void> {
        const { answers, modules } = context;
        const outputDir = path.resolve(process.cwd(), answers.outputDirectory);

        let readme = `# API Modules

Auto-generated API modules from Swagger/OpenAPI specification.

## Configuration

- **Library**: ${answers.library}
- **Language**: ${answers.language}
- **Generated Modules**: ${modules.length}

## Usage

`;

        switch (answers.library) {
            case 'zustand':
                readme += `### Zustand Store Example

\`\`\`${answers.language}
import { use${modules[0]?.moduleName}Store } from './api';

function MyComponent() {
  const { data, loading, error, ${modules[0]?.endpoints[0]?.functionName} } = use${modules[0]?.moduleName}Store();

  useEffect(() => {
    ${modules[0]?.endpoints[0]?.functionName}();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
\`\`\`
`;
                break;

            case 'redux-toolkit':
                readme += `### Redux Toolkit Example

\`\`\`${answers.language}
import { ${modules[0]?.endpoints[0]?.functionName} } from './api';
import { useDispatch, useSelector } from 'react-redux';

function MyComponent() {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.${modules[0]?.moduleName.charAt(0).toLowerCase() + modules[0]?.moduleName.slice(1)});

  useEffect(() => {
    dispatch(${modules[0]?.endpoints[0]?.functionName}());
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
\`\`\`
`;
                break;

            case 'axios-hooks':
            case 'fetch-api':
                readme += `### Hook Example

\`\`\`${answers.language}
import { use${modules[0]?.endpoints[0]?.functionName.charAt(0).toUpperCase() + modules[0]?.endpoints[0]?.functionName.slice(1)} } from './api';

function MyComponent() {
  const { data, loading, error${answers.library === 'fetch-api' ? ', execute' : ''} } = use${modules[0]?.endpoints[0]?.functionName.charAt(0).toUpperCase() + modules[0]?.endpoints[0]?.functionName.slice(1)}();

  ${answers.library === 'fetch-api' ? `useEffect(() => {
    execute();
  }, []);` : ''}

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
\`\`\`
`;
                break;
        }

        readme += `
## Environment Variables

Make sure to set your API base URL:

\`\`\`
REACT_APP_API_BASE_URL=https://your-api-url.com
\`\`\`

## Modules

${modules.map(m => `- **${m.moduleName}**: ${m.endpoints.length} endpoint(s)`).join('\n')}

---

Generated by [rapid-front](https://github.com/yourusername/rapid-front)
`;

        await fs.writeFile(path.join(outputDir, 'README.md'), readme, 'utf-8');
    }

    private async formatCode(code: string, language: string): Promise<string> {
        try {
            return await prettier.format(code, {
                parser: language === 'typescript' ? 'typescript' : 'babel',
                semi: true,
                singleQuote: true,
                trailingComma: 'es5',
                printWidth: 100,
            });
        } catch (error) {
            console.warn(chalk.yellow('Warning: Failed to format code with Prettier'));
            return code;
        }
    }

    private getTypeScriptType(property: any): string {
        if (!property) return 'any';

        if (property.type === 'array') {
            const itemType = property.items ? this.getTypeScriptType(property.items) : 'any';
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
    }
    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }
}
