#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import chalk from 'chalk';

const program = new Command();

program
    .name('rapid-front')
    .description('Automate the bridge between Swagger (OpenAPI) documentation and frontend state management')
    .version('1.0.0');

program
    .command('init')
    .description('Initialize and generate frontend API modules from Swagger/OpenAPI')
    .action(async () => {
        try {
            await initCommand();
        } catch (error) {
            console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

program.parse();
