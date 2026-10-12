#!/usr/bin/env node
/**
 * Verifies that every reciter listed in src/lib/quran.ts really has audio on everyayah.com.
 *
 *   node scripts/check-reciters.mjs           quick check: 6 sample ayahs per reciter (seconds)
 *   node scripts/check-reciters.mjs --full    every one of the 6,236 ayahs per reciter (several minutes each)
 *
 * Exits with code 1 if anything is missing, so it can run in CI before a release.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const full = process.argv.includes('--full');
const source = readFileSync(fileURLToPath(new URL('../src/lib/quran.ts', import.meta.url)), 'utf8');
const reciters = [...source.matchAll(/\{\s*id:\s*'([^']+)',\s*ar:\s*'([^']+)',\s*en:\s*'([^']+)'\s*\}/g)].map(m => ({ id: m[1], name: m[3] }));
if (reciters.length === 0) throw new Error('No reciters found in src/lib/quran.ts');

const pad = (n, l) => String(n).padStart(l, '0');
const url = (folder, surah, ayah) => `https://everyayah.com/data/${folder}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;

const SAMPLE = [[1, 1], [1, 7], [2, 255], [2, 286], [36, 83], [114, 6]];

async function ayahList() {
  if (!full) return SAMPLE;
  const { data } = await (await fetch('https://api.alquran.cloud/v1/surah')).json();
  return data.flatMap(s => Array.from({ length: s.numberOfAyahs }, (_, i) => [s.number, i + 1]));
}

async function head(target) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(target, { method: 'HEAD' });
      return res.status;
    } catch {
      /* retry */
    }
  }
  return -1;
}

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }));
  return results;
}

const ayahs = await ayahList();
let failed = false;
for (const r of reciters) {
  const statuses = await pool(ayahs, 16, ([s, a]) => head(url(r.id, s, a)));
  const missing = ayahs.filter((_, i) => statuses[i] !== 200);
  const ok = ayahs.length - missing.length;
  console.log(`${missing.length ? 'FAIL' : ' ok '}  ${r.id.padEnd(34)} ${ok}/${ayahs.length}  ${r.name}`);
  if (missing.length) {
    failed = true;
    console.log(`        first missing: ${missing.slice(0, 5).map(([s, a]) => `${s}:${a}`).join(', ')}`);
  }
}
process.exit(failed ? 1 : 0);
