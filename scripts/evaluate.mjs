#!/usr/bin/env node
// Run after npm run build. Store scanner metadata, never recovered source text.
import { readFile, writeFile } from 'node:fs/promises';
import { scan } from '../dist/scan.js';

const baseline = JSON.parse(await readFile(new URL('../research/baseline.json', import.meta.url), 'utf8'));
const evaluation = { generatedAt: new Date().toISOString(), method: 'Built MVP scanner, default limits, same 16 baseline homepages, at most two sites concurrently; metadata only.', sites: [] };
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < baseline.sites.length) {
    const index = next++;
    const { host, category } = baseline.sites[index];
    const report = await scan(host);
    evaluation.sites[index] = { host, category, report };
    console.log(`${host}: ${report.summary.mapsChecked} checked maps / ${report.summary.inspected} inspected, ${report.summary.mapsUnavailable} unavailable, ${report.summary.mapsInvalid} invalid, ${report.requests.length} requests${report.error ? `; ${report.error}` : ''}`);
  }
}));
await writeFile(new URL('../research/mvp.json', import.meta.url), JSON.stringify(evaluation, null, 2) + '\n');
