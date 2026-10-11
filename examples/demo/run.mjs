import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildDemo, serveDemo } from './fixture.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--serve')) {
  throw new Error('Usage: npm run demo -- [--serve]');
}
const demo = await serveDemo(await buildDemo());
try {
  console.log('\n  ◇ sourcemapped playground\n  Same tiny app. Three ways to publish it.');
  if (args[0] === '--serve') console.log(`\n  Browser: ${demo.origin}/mixed/`);
  const scenarios = [
    ['mapped', 'WITH MAPS', 'Expect 1 analyzed asset and 2 embedded TypeScript source entries.'],
    ['unmapped', 'WITHOUT MAPS', 'Expect 1 inspected asset with no advertised map.'],
    ['mixed', 'MIXED', 'Expect 1 analyzed asset and 1 asset without a map reference.'],
  ];
  for (const [mode, label, expectation] of scenarios) {
    const url = `${demo.origin}/${mode}/`;
    console.log(`\n  ── ${label} ──\n  ${expectation}`);
    // Inherit the real terminal so CLI color/progress and NO_COLOR behave normally.
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [
        fileURLToPath(new URL('../../dist/cli.js', import.meta.url)), url,
      ], { stdio: 'inherit', timeout: 15_000 });
      child.once('error', reject);
      child.once('exit', (code, signal) => code === 0 ? resolve(undefined) : reject(new Error(`Demo scan failed: ${signal ?? code}`)));
    });
  }
  if (args[0] === '--serve') {
    console.log(`\n  ◇ Demo server is running\n  Open ${demo.origin}/mixed/ in a browser.\n  Try: node dist/cli.js ${demo.origin}/mixed/ --verbose\n  Ctrl+C stops the server.\n`);
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
