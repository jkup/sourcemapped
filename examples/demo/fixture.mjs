import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

// Generate actual bundler output in memory: no stale maps or tracked build artifacts.
export async function buildDemo() {
  const root = fileURLToPath(new URL('./', import.meta.url));
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  /** @type {Map<string, {body: string, type: string}>} */
  const files = new Map();
  for (const mode of ['mapped', 'unmapped']) {
    const result = await build({
      absWorkingDir: root, entryPoints: ['src/app.ts'],
      outfile: `dist/${mode}/app.js`, bundle: true, minify: true,
      platform: 'browser', format: 'esm', target: 'es2022',
      sourcemap: mode === 'mapped' ? 'linked' : false,
      sourcesContent: true, write: false,
    });
    files.set(`/${mode}/`, { body: html, type: 'text/html' });
    for (const output of result.outputFiles) {
      const name = output.path.endsWith('.map') ? 'app.js.map' : 'app.js';
      files.set(`/${mode}/${name}`, {
        body: output.text, type: name.endsWith('.map') ? 'application/json' : 'application/javascript',
      });
    }
  }
  files.set('/mixed/', {
    body: html.replace('./app.js', '/mapped/app.js').replace('</html>', '<script src="/mixed/extra.js"></script>\n</html>'),
    type: 'text/html',
  });
  files.set('/mixed/extra.js', { body: '/* A small additional asset without an advertised map. */', type: 'application/javascript' });
  return files;
}

/** @param {Awaited<ReturnType<typeof buildDemo>>} files */
export async function serveDemo(files) {
  /** @type {string[]} */
  const requests = [];
  const server = createServer((request, response) => {
    const path = request.url ?? '/';
    requests.push(path);
    // Explicit routes only: never serve source files or arbitrary filesystem paths.
    const file = files.get(path);
    response.writeHead(file ? 200 : 404, {
      'content-type': file?.type ?? 'text/plain', 'cache-control': 'no-store',
    });
    response.end(file?.body ?? 'Not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(undefined));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a loopback address');
  return {
    origin: `http://127.0.0.1:${address.port}`, requests,
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(() => resolve(undefined)));
    },
  };
}
