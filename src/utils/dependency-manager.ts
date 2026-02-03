import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { LibraryChoice } from '../types.js';

const execAsync = util.promisify(exec);

export class DependencyManager {
    private dependencies: Record<LibraryChoice, string[]> = {
        'zustand': ['zustand', 'axios'],
        'redux-toolkit': ['@reduxjs/toolkit', 'react-redux', 'axios'],
        'axios-hooks': ['axios-hooks', 'axios'],
        'fetch-api': [] // Native Fetch needs no extra libs, assuming React is present
    };

    async checkAndInstall(library: LibraryChoice): Promise<void> {
        const requiredDeps = this.dependencies[library];

        if (requiredDeps.length === 0) return;

        const missingDeps = await this.getMissingDependencies(requiredDeps);

        if (missingDeps.length === 0) {
            return;
        }

        console.log(chalk.yellow(`\n⚠️  The following required dependencies are missing: ${chalk.bold(missingDeps.join(', '))}`));

        const { install } = await inquirer.prompt([{
            type: 'confirm',
            name: 'install',
            message: `Would you like to install them now?`,
            default: true
        }]);

        if (install) {
            await this.installDependencies(missingDeps);
        } else {
            console.log(chalk.gray(`\nSkipping installation. Please run: npm install ${missingDeps.join(' ')}`));
        }
    }

    private async getMissingDependencies(deps: string[]): Promise<string[]> {
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');

        if (!await fs.pathExists(packageJsonPath)) {
            // If no package.json, we can't really check, so assume they rely on us or it's a new project
            // But usually we should warn. For now let's just return all deps if we can't find package.json
            // Or maybe better: warn user
            return deps;
        }

        try {
            const packageJson = await fs.readJson(packageJsonPath);
            const installed = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            return deps.filter(dep => !installed[dep]);
        } catch (error) {
            return deps;
        }
    }

    private async installDependencies(deps: string[]): Promise<void> {
        const packageManager = await this.detectPackageManager();
        const installCmd = packageManager === 'npm' ? 'install' : 'add';
        const command = `${packageManager} ${installCmd} ${deps.join(' ')}`;

        const spinner = ora(`Installing dependencies with ${packageManager}...`).start();

        try {
            await execAsync(command);
            spinner.succeed(chalk.green(`Successfully installed: ${deps.join(', ')}`));
        } catch (error: any) {
            spinner.fail(chalk.red(`Failed to install dependencies`));
            console.error(chalk.red(error.message));
        }
    }

    private async detectPackageManager(): Promise<string> {
        if (await fs.pathExists(path.resolve(process.cwd(), 'yarn.lock'))) return 'yarn';
        if (await fs.pathExists(path.resolve(process.cwd(), 'pnpm-lock.yaml'))) return 'pnpm';
        return 'npm';
    }
}
