#!/usr/bin/env node
/**
 * Verifies the whole-surah reciters (one MP3 per surah) and measures their sizes.
 *
 *   node scripts/check-surah-reciters.mjs            checks all 114 files of every reciter (HEAD requests)
 *   node scripts/check-surah-reciters.mjs --json     also prints the entries (with measured MB) ready to paste into quran.ts
 *
 * The reciters are the ones in SURAH_RECITERS below (kept in sync with src/lib/quran.ts: base URL + padding).
 * Exits with code 1 if any file is missing.
 */
const json = process.argv.includes('--json');

/** [key, arabic name, english name, base url, zero padded file names] */
export const SURAH_RECITERS = [
  ['maher-muaiqly', 'ماهر المعيقلي', 'Maher Al-Muaiqly', 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/', true],
  ['saad-ghamdi', 'سعد الغامدي', 'Saad Al-Ghamdi', 'https://cdn.mp3quran.net/audio/saad-ghamdi/r1/', true],
  ['abdulrahman-sudais', 'عبد الرحمن السديس', 'Abdulrahman As-Sudais', 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/', true],
  ['saud-shuraim', 'سعود الشريم', 'Saud Ash-Shuraim', 'https://cdn.mp3quran.net/audio/saud-shuraim/r1/', true],
  ['alafasy', 'مشاري العفاسي', 'Mishary Alafasy', 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/', true],
  ['husary', 'محمود خليل الحصري', 'Mahmoud Al-Husary', 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/', true],
  ['husary-mujawwad', 'محمود خليل الحصري (مجوّد)', 'Mahmoud Al-Husary (Mujawwad)', 'https://cdn.mp3quran.net/audio/mahmoud-husary/r2/', true],
  ['abdulbasit-murattal', 'عبد الباسط عبد الصمد (مرتّل)', 'Abdul Basit (Murattal)', 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/', true],
  ['abdulbasit-mujawwad', 'عبد الباسط عبد الصمد (مجوّد)', 'Abdul Basit (Mujawwad)', 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/', true],
  ['minshawi', 'محمد صديق المنشاوي', 'Al-Minshawi', 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/', true],
  ['minshawi-mujawwad', 'محمد صديق المنشاوي (مجوّد)', 'Al-Minshawi (Mujawwad)', 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r2/', true],
  ['ali-hudhaifi', 'علي الحذيفي', 'Ali Al-Hudhaifi', 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r1/', true],
  ['salah-budair', 'صلاح البدير', 'Salah Al-Budair', 'https://cdn.mp3quran.net/audio/salah-budair/r1/', true],
  ['hani-rifai', 'هاني الرفاعي', 'Hani Ar-Rifai', 'https://cdn.mp3quran.net/audio/hani-rifai/r1/', true],
  ['yasser-dosari', 'ياسر الدوسري', 'Yasser Ad-Dosari', 'https://cdn.mp3quran.net/audio/yasser-dosari/r1/', true],
  ['nasser-qatami', 'ناصر القطامي', 'Nasser Al-Qatami', 'https://cdn.mp3quran.net/audio/nasser-qatami/r1/', true],
  ['ahmad-ajmi', 'أحمد العجمي', 'Ahmad Al-Ajmi', 'https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/', true],
  ['abubakr-shatri', 'أبو بكر الشاطري', 'Abu Bakr Ash-Shatri', 'https://cdn.mp3quran.net/audio/abubakr-shatri/r1/', true],
  ['khalid-qahtani', 'خالد القحطاني', 'Khalid Al-Qahtani', 'https://cdn.mp3quran.net/audio/khalid-qahtani/r1/', true],
  ['muhammad-tablawi', 'محمد الطبلاوي', 'Mohamed Al-Tablawi', 'https://cdn.mp3quran.net/audio/muhammad-tablawi/r1/', true],
  ['muhammad-ayyub', 'محمد أيوب', 'Muhammad Ayyub', 'https://cdn.mp3quran.net/audio/muhammad-ayyub/r1/', true],
  ['muhammad-jibreel', 'محمد جبريل', 'Muhammad Jibreel', 'https://cdn.mp3quran.net/audio/muhammad-jibreel/r1/', true],
  ['mahmoud-banna', 'محمود علي البنا', 'Mahmoud Ali Al-Banna', 'https://cdn.mp3quran.net/audio/mahmoud-banna/r1/', true],
  ['mustafa-ismail', 'مصطفى إسماعيل', 'Mustafa Ismail', 'https://cdn.mp3quran.net/audio/mustafa-ismail/r1/', true],
  ['abdulaziz-zahrani', 'عبد العزيز الزهراني', 'Abdulaziz Az-Zahrani', 'https://cdn.mp3quran.net/audio/abdulaziz-zahrani/r1/', true],
  ['salah-bukhatir', 'صلاح بخاطر', 'Salah Bukhatir', 'https://cdn.mp3quran.net/audio/salah-bukhatir/r1/', true],
  ['ibrahim-akhdar', 'إبراهيم الأخضر', 'Ibrahim Al-Akhdar', 'https://cdn.mp3quran.net/audio/ibrahim-akhdar/r1/', true],
  ['ali-jaber', 'علي جابر', 'Ali Jaber', 'https://cdn.mp3quran.net/audio/ali-jaber/r1/', true],
];

const file = (pad, n) => `${pad ? String(n).padStart(3, '0') : n}.mp3`;

async function head(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      let bytes = Number(res.headers.get('content-length') ?? 0);
      if (res.ok && bytes === 0) {
        // Some CDNs omit Content-Length on HEAD: ask for the first byte and read the total from Content-Range.
        const part = await fetch(url, { headers: { Range: 'bytes=0-0' } });
        bytes = Number((part.headers.get('content-range') ?? '').split('/')[1] ?? 0) || 0;
        await part.arrayBuffer().catch(() => {});
      }
      return { status: res.status, bytes };
    } catch {
      /* retry */
    }
  }
  return { status: -1, bytes: 0 };
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

let failed = false;
const entries = [];
for (const [key, ar, en, base, pad] of SURAH_RECITERS) {
  const results = await pool(Array.from({ length: 114 }, (_, i) => i + 1), 12, n => head(base + file(pad, n)));
  const bad = results.map((r, i) => ({ ...r, surah: i + 1 })).filter(r => r.status !== 200 || r.bytes < 20_000);
  const mb = Math.round(results.reduce((s, r) => s + r.bytes, 0) / 1048576);
  const ok = bad.length === 0;
  if (!ok) failed = true;
  console.log(`${ok ? ' ok ' : 'FAIL'} ${key.padEnd(22)} ${String(114 - bad.length).padStart(3)}/114  ${String(mb).padStart(5)} MB  ${en}${ok ? '' : '  missing: ' + bad.slice(0, 8).map(b => `${b.surah}(${b.status})`).join(',')}`);
  entries.push({ key, ar, en, base, pad, mb, ok });
}
if (json) console.log(JSON.stringify(entries.filter(e => e.ok), null, 2));
process.exit(failed ? 1 : 0);
