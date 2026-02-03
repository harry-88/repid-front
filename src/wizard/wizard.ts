import inquirer from 'inquirer';
import { WizardAnswers, LibraryChoice, LanguageChoice } from '../types.js';
import chalk from 'chalk';

export async function runWizard(availableTags?: string[]): Promise<WizardAnswers> {
    console.log(chalk.cyan.bold('\n🚀 Welcome to Rapid Front!\n'));
    console.log(chalk.gray('Let\'s set up your frontend API modules from Swagger/OpenAPI.\n'));

    const questions: any[] = [
        {
            type: 'input',
            name: 'schemaSource',
            message: 'Provide the Swagger JSON/YAML URL or local file path:',
            validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                    return 'Schema source is required';
                }
                return true;
            },
            filter: (input: string) => {
                return input.trim().replace(/^['"]|['"]$/g, '');
            }
        },
        {
            type: 'list',
            name: 'library',
            message: 'Which state management/library would you like to use?',
            choices: [
                { name: 'Zustand (Recommended)', value: 'zustand' },
                { name: 'Redux Toolkit', value: 'redux-toolkit' },
                { name: 'Axios Hooks', value: 'axios-hooks' },
                { name: 'Fetch API', value: 'fetch-api' }
            ],
            default: 'zustand'
        },
        {
            type: 'list',
            name: 'language',
            message: 'TypeScript or JavaScript?',
            choices: [
                { name: 'TypeScript (Recommended)', value: 'typescript' },
                { name: 'JavaScript', value: 'javascript' }
            ],
            default: 'typescript'
        },
        {
            type: 'input',
            name: 'outputDirectory',
            message: 'Where should I save the generated modules?',
            default: './src/api'
        },
        {
            type: 'list',
            name: 'selectionMode',
            message: 'Generate all modules or select specific tags/modules?',
            choices: [
                { name: 'Generate all modules', value: 'all' },
                { name: 'Select specific tags', value: 'selective' }
            ],
            default: 'all'
        }
    ];

    const answers = await inquirer.prompt(questions);

    return answers as WizardAnswers;
}

export async function runTagSelection(availableTags: string[]): Promise<string[]> {
    const tagSelection = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedTags',
            message: 'Select tags to generate:',
            choices: availableTags.map(tag => ({ name: tag, value: tag })),
            validate: (input: string[]) => {
                if (input.length === 0) {
                    return 'Please select at least one tag';
                }
                return true;
            }
        }
    ]);
    return tagSelection.selectedTags;
}
