import { parseTajweed } from '../src/lib/tajweed.ts';
import { normalizeSegments } from '../src/lib/wordtiming.ts';

const surahs = process.argv.slice(2).map(Number);
let ayahs = 0;
let mismatches = 0;
for (const n of surahs) {
  const taj = await (await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${n}`)).json();
  const seg = await (await fetch(`https://api.quran.com/api/v4/recitations/7/by_chapter/${n}?fields=segments&per_page=300`)).json();
  const segByKey = new Map(seg.audio_files.map((f: { verse_key: string; segments: unknown }) => [f.verse_key, normalizeSegments(f.segments)]));
  for (const v of taj.verses) {
    const words = parseTajweed(v.text_uthmani_tajweed);
    const segs = (segByKey.get(v.verse_key) ?? []) as { to: number }[];
    const maxTo = segs.reduce((m, s) => Math.max(m, s.to), 0);
    ayahs++;
    if (segs.length === 0 || maxTo !== words.length) {
      mismatches++;
      if (mismatches <= 8) console.log(`  mismatch ${v.verse_key}: words=${words.length} segments cover ${maxTo} (segs=${segs.length})`);
    }
  }
}
console.log(`surahs ${surahs.join(',')}: ${ayahs} ayahs checked, ${mismatches} mismatches`);
