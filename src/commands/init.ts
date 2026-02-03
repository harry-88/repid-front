import { runWizard, runTagSelection } from '../wizard/wizard.js';
import { SwaggerParserService } from '../parser/swagger-parser.js';
import { SwaggerMapper } from '../mapper/swagger-mapper.js';
import { CodeGenerator } from '../generator/code-generator.js';
import { DependencyManager } from '../utils/dependency-manager.js';
import { GenerationContext } from '../types.js';
import chalk from 'chalk';
import ora from 'ora';

export async function initCommand(): Promise<void> {
    console.clear();

    // Step 1: Parse the schema first to get available tags
    const initialAnswers = await runWizard();

    const parserService = new SwaggerParserService();
    const spinner = ora('Parsing Swagger/OpenAPI schema...').start();

    let api;
    try {
        api = await parserService.parseSchema(initialAnswers.schemaSource);
        parserService.validateVersion(api);
        spinner.succeed(chalk.green('Schema parsed successfully!'));
    } catch (error) {
        spinner.fail(chalk.red('Failed to parse schema'));
        throw error;
    }

    // Extract tags
    const availableTags = parserService.extractTags(api);

    if (availableTags.length > 0) {
        console.log(chalk.cyan(`\n📋 Found ${availableTags.length} tag(s): ${availableTags.join(', ')}\n`));
    }

    // Step 2: If selective mode, ask which tags to include
    let finalAnswers = initialAnswers;
    if (initialAnswers.selectionMode === 'selective' && availableTags.length > 0) {
        const selectedTags = await runTagSelection(availableTags);
        finalAnswers = { ...initialAnswers, selectedTags };
    }

    // Step 3: Map Swagger to modules
    spinner.start('Transforming schema to modules...');
    const mapper = new SwaggerMapper();
    const modules = mapper.mapToModules(api, finalAnswers.selectedTags);
    const schemas = mapper.getSchemas();
    spinner.succeed(chalk.green(`Transformed into ${modules.length} module(s)`));

    if (modules.length === 0) {
        console.log(chalk.yellow('\n⚠️  No modules to generate. Please check your schema or tag selection.\n'));
        return;
    }

    // Step 4: Generate code
    const context: GenerationContext = {
        answers: finalAnswers,
        modules,
        schemas
    };

    const generator = new CodeGenerator();
    await generator.initialize();
    await generator.generate(context);

    // Step 5: Check and install dependencies
    const dependencyManager = new DependencyManager();
    await dependencyManager.checkAndInstall(finalAnswers.library);

    // Step 6: Show next steps
    console.log(chalk.cyan.bold('📚 Next Steps:\n'));
    console.log(chalk.gray(`1. Review the generated files in ${finalAnswers.outputDirectory}`));
    console.log(chalk.gray(`2. Update the API_BASE_URL in your environment variables`));
    console.log(chalk.gray(`3. Import and use the generated modules in your app`));
    console.log(chalk.gray(`4. Check the README.md for usage examples\n`));
}
