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
  const extra = await build({
    absWorkingDir: root, entryPoints: ['src/format.ts'], outfile: 'dist/validation/extra.js',
    bundle: true, minify: true, platform: 'browser', format: 'esm', target: 'es2022',
    sourcemap: 'linked', sourcesContent: true, write: false,
  });
  for (const output of extra.outputFiles) {
    const isMap = output.path.endsWith('.map');
    files.set(`/validation/extra.js${isMap ? '.map' : ''}`, {
      body: output.text, type: isMap ? 'application/json' : 'application/javascript',
    });
    // The extra build has one source: ACAA references source index 1 (out of range).
    // Keep valid JSON/VLQ so the failure exercises maplint's mapping validator.
    files.set(`/validation/bad.js${isMap ? '.map' : ''}`, {
      body: isMap ? JSON.stringify({ ...JSON.parse(output.text), file: 'bad.js', mappings: 'ACAA' })
        : output.text.replace('sourceMappingURL=extra.js.map', 'sourceMappingURL=bad.js.map'),
      type: isMap ? 'application/json' : 'application/javascript',
    });
  }
  files.set('/validation/', {
    body: html.replace('./app.js', '/mapped/app.js').replace('</html>',
      '<script type="module" src="./extra.js"></script>\n<script type="module" src="./bad.js"></script>\n</html>'),
    type: 'text/html',
  });
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
