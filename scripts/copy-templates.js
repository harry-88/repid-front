import fs from 'fs-extra';
import path from 'path';

async function copyTemplates() {
    const srcDir = path.resolve('src/templates');
    const destDir = path.resolve('dist/templates');

    try {
        await fs.ensureDir(destDir);
        await fs.copy(srcDir, destDir);
        console.log('✅ Templates copied successfully to dist/templates');
    } catch (err) {
        console.error('❌ Failed to copy templates:', err);
        process.exit(1);
    }
}

copyTemplates();
