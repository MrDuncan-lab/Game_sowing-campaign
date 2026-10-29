// Build the single-file game and refresh the two files kept at the repo root for deployments that download them
// (deploy/setup.sh, the README link): posevnaya-preview.html and its version.json come from the same build.
import { execSync } from 'node:child_process';
import { copyFileSync, readFileSync } from 'node:fs';
execSync('npx vite build', { stdio: 'inherit' });
copyFileSync('dist/index.html', 'posevnaya-preview.html');
copyFileSync('dist/version.json', 'version.json');
console.log('posevnaya-preview.html + version.json:', JSON.parse(readFileSync('version.json', 'utf8')).build);
