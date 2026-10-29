import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One id per build: the game carries it inside, and version.json next to index.html says which build the server has
// now. The game compares the two and reloads itself onto a newer build (src/ui/autoUpdate.ts).
const commit = (process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? '').slice(0, 7);
const BUILD_ID = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}${commit ? '-' + commit : ''}`;

function buildVersion(): Plugin {
  return {
    name: 'posevnaya-build-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) + '\n' });
      // Cloudflare Pages reads _headers: the version file is never cached, the page is always revalidated
      this.emitFile({
        type: 'asset', fileName: '_headers',
        source: '/version.json\n  Cache-Control: no-store\n  Access-Control-Allow-Origin: *\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n',
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), viteSingleFile(), buildVersion()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: { target: 'es2020', assetsInlineLimit: 100000000 },
});
