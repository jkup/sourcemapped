import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildDemo, serveDemo } from './fixture.mjs';

const { values } = parseArgs({ options: { serve: { type: 'boolean' }, all: { type: 'boolean' } } });
const demo = await serveDemo(await buildDemo());
try {
  const scenarios = values.all ? ['mapped', 'unmapped', 'mixed'] : ['mixed'];
  for (const mode of scenarios) {
    const url = `${demo.origin}/${mode}/`;
    // Inherit the real terminal so CLI color/progress and NO_COLOR behave normally.
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        fileURLToPath(new URL('../../dist/cli.js', import.meta.url)), url,
      ], { stdio: 'inherit', timeout: 15_000 });
      child.once('error', reject);
      child.once('exit', (code, signal) => code === 0 ? resolve(undefined) : reject(new Error(`Demo scan failed: ${signal ?? code}`)));
    });
  }
  if (values.serve) {
    console.log(`  Demo running: ${demo.origin}/mixed/ · Ctrl+C to stop.\n`);
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
