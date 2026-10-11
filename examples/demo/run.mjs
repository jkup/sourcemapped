import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildDemo, serveDemo } from './fixture.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--serve')) {
  throw new Error('Usage: npm run demo -- [--serve]');
}
const demo = await serveDemo(await buildDemo());
try {
  for (const mode of ['mapped', 'unmapped']) {
    const url = `${demo.origin}/${mode}/`;
    console.log(`\nDemo: ${mode} — ${url}`);
    const result = await promisify(execFile)(process.execPath, [
      fileURLToPath(new URL('../../dist/cli.js', import.meta.url)), url, '--verbose', '--no-color',
    ], { timeout: 15_000, maxBuffer: 1024 * 1024 });
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  }
  if (args[0] === '--serve') {
    console.log(`Open ${demo.origin}/mapped/ or ${demo.origin}/unmapped/ in a browser. Ctrl+C stops the server.`);
    await new Promise(resolve => {
      const stop = () => {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        resolve(undefined);
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    });
  }
} finally {
  await demo.close();
}
