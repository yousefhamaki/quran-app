import { useEffect, useRef, useState } from 'react';
import { RECITERS, TAFSIRS, audioUrl, fetchSurahs, fetchSurah, fetchTafsir } from './api.js';

const T = {
  en: { title: 'Holy Quran', ayahs: 'ayahs', back: 'Surahs', choose: 'Choose a reciter', pause: 'Stop', next: 'Next ayah', close: 'Close', loading: 'Loading...', error: 'Something went wrong. Check your connection.', lang: 'العربية', search: 'Search surah (name or number)', bookmarks: 'Bookmarks', bookmark: 'Bookmark', unbookmark: 'Remove bookmark', auto: 'Continuous', ayah: 'Ayah', noResults: 'No results', tafsir: 'Tafsir', tafsirLoading: 'Loading tafsir...', tafsirEmpty: 'No tafsir available for this ayah.' },
  ar: { title: 'القرآن الكريم', ayahs: 'آية', back: 'السور', choose: 'اختر القارئ', pause: 'إيقاف', next: 'الآية التالية', close: 'إغلاق', loading: 'جارٍ التحميل...', error: 'حدث خطأ. تحقق من الاتصال.', lang: 'English', search: 'ابحث عن سورة (الاسم أو الرقم)', bookmarks: 'العلامات', bookmark: 'إضافة علامة', unbookmark: 'إزالة العلامة', auto: 'تشغيل متواصل', ayah: 'آية', noResults: 'لا نتائج', tafsir: 'التفسير', tafsirLoading: 'جارٍ تحميل التفسير...', tafsirEmpty: 'لا يوجد تفسير لهذه الآية.' },
};

const SPEEDS = [0.75, 1, 1.25, 1.5];

const load = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const loadJSON = (k, d) => { try { return JSON.parse(load(k, '')) ?? d; } catch { return d; } };

// Strip Arabic diacritics / normalise letters so search matches plain typing.
const norm = s => s.normalize('NFD').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();

export default function App() {
  const [lang, setLang] = useState(load('lang', 'ar'));
  const [reciter, setReciter] = useState(load('reciter', RECITERS[0].id));
  const [speed, setSpeed] = useState(Number(load('speed', '1')));
  const [continuous, setContinuous] = useState(load('continuous', '1') === '1');
  const [bookmarks, setBookmarks] = useState(loadJSON('bookmarks', [])); // [{s, a}]
  const [query, setQuery] = useState('');
  const [surahs, setSurahs] = useState([]);
  const [surah, setSurah] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [selected, setSelected] = useState(null); // ayah number whose reciter sheet is open
  const [playing, setPlaying] = useState(null); // { ayah }
  const [status, setStatus] = useState('loading');
  const [tafsirId, setTafsirId] = useState(Number(load('tafsir', String(TAFSIRS[0].id))));
  const [tafsirAyah, setTafsirAyah] = useState(null); // ayah whose tafsir panel is open
  const [tafsirText, setTafsirText] = useState({ state: 'idle', text: '' });
  const audio = useRef(new Audio());
  const t = T[lang];

  // Latest values for the audio 'ended' listener, which is registered once.
  const live = useRef({});
  live.current = { playing, ayahs, continuous };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    save('lang', lang);
  }, [lang]);

  useEffect(() => {
    fetchSurahs().then(s => { setSurahs(s); setStatus('ok'); }).catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    const a = audio.current;
    const onEnd = () => {
      const { playing: p, ayahs: list, continuous: c } = live.current;
      if (c && p && p.ayah < list.length) playRef.current(p.ayah + 1);
      else setPlaying(null);
    };
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('ended', onEnd); a.pause(); };
  }, []);

  useEffect(() => {
    if (!tafsirAyah || !surah) return;
    let cancelled = false;
    setTafsirText({ state: 'loading', text: '' });
    fetchTafsir(tafsirId, surah.number, tafsirAyah)
      .then(text => !cancelled && setTafsirText({ state: 'ok', text }))
      .catch(() => !cancelled && setTafsirText({ state: 'error', text: '' }));
    return () => { cancelled = true; };
  }, [tafsirId, tafsirAyah, surah]);

  function openTafsir() { setTafsirAyah(selected); setSelected(null); }
  function changeTafsir(id) { setTafsirId(id); save('tafsir', String(id)); }

  async function openSurah(s, scrollTo) {
    stop(); setSurah(s); setAyahs([]); setStatus('loading');
    try {
      setAyahs(await fetchSurah(s.number));
      setStatus('ok');
      if (scrollTo) setTimeout(() => document.getElementById(`ayah-${scrollTo}`)?.scrollIntoView({ block: 'center' }), 50);
    } catch { setStatus('error'); }
  }

  function play(ayah, rec = reciter) {
    const a = audio.current;
    a.src = audioUrl(rec, surah.number, ayah);
    a.playbackRate = speed;
    a.play().catch(() => setStatus('error'));
    setPlaying({ ayah });
    document.getElementById(`ayah-${ayah}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const playRef = useRef(play);
  playRef.current = play;

  function stop() { audio.current.pause(); setPlaying(null); }
  function pickReciter(id) {
    setReciter(id); save('reciter', id);
    play(selected, id);
    setSelected(null);
  }
  function next() { if (playing && playing.ayah < ayahs.length) play(playing.ayah + 1); else stop(); }
  function changeSpeed(v) { setSpeed(v); save('speed', String(v)); audio.current.playbackRate = v; }
  function toggleContinuous() { const v = !continuous; setContinuous(v); save('continuous', v ? '1' : '0'); }

  const isMarked = (s, a) => bookmarks.some(b => b.s === s && b.a === a);
  function toggleBookmark(s, a) {
    const list = isMarked(s, a) ? bookmarks.filter(b => !(b.s === s && b.a === a)) : [...bookmarks, { s, a }];
    setBookmarks(list); save('bookmarks', JSON.stringify(list));
  }

  const reciterName = r => (lang === 'ar' ? r.ar : r.en);
  const current = RECITERS.find(r => r.id === reciter);
  const q = norm(query.trim());
  const filtered = !q ? surahs : surahs.filter(s =>
    String(s.number) === q || norm(s.name).includes(q) || norm(s.englishName).includes(q) || norm(s.englishNameTranslation).includes(q));
  const surahName = s => (lang === 'ar' ? s.name : s.englishName);

  return (
    <div className="app">
      <header>
        {surah && <button className="ghost" onClick={() => { stop(); setSelected(null); setTafsirAyah(null); setSurah(null); setStatus('ok'); }}>{t.back}</button>}
        <h1>{surah ? surahName(surah) : t.title}</h1>
        <button className="ghost" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{t.lang}</button>
      </header>

      {status === 'loading' && <p className="msg">{t.loading}</p>}
      {status === 'error' && <p className="msg err">{t.error}</p>}

      {!surah && (
        <>
          <input className="search" type="search" placeholder={t.search} value={query} onChange={e => setQuery(e.target.value)} />

          {bookmarks.length > 0 && !q && surahs.length > 0 && (
            <section className="marks">
              <h3>{t.bookmarks}</h3>
              <div className="chips">
                {bookmarks.map(b => {
                  const s = surahs.find(x => x.number === b.s);
                  return s && <button key={`${b.s}:${b.a}`} className="chip" onClick={() => openSurah(s, b.a)}>{surahName(s)} · {b.a}</button>;
                })}
              </div>
            </section>
          )}

          <ul className="surahs">
            {filtered.map(s => (
              <li key={s.number} onClick={() => openSurah(s)}>
                <span className="num">{s.number}</span>
                <span className="names">
                  <b>{surahName(s)}</b>
                  <small>{lang === 'ar' ? s.englishName : s.englishNameTranslation} · {s.numberOfAyahs} {t.ayahs}</small>
                </span>
              </li>
            ))}
            {status === 'ok' && filtered.length === 0 && <li className="empty">{t.noResults}</li>}
          </ul>
        </>
      )}

      {surah && (
        <main className="reader">
          {ayahs.map(a => (
            <div key={a.number} id={`ayah-${a.number}`} className={'ayah' + (playing?.ayah === a.number ? ' playing' : '')} onClick={() => setSelected(a.number)}>
              <p className="ar">{a.ar} <span className="end">﴿{a.number.toLocaleString('ar-EG')}﴾</span>{isMarked(surah.number, a.number) && <span className="star"> ★</span>}</p>
              <p className="en" dir="ltr">{a.en}</p>
            </div>
          ))}
        </main>
      )}

      {playing && (
        <div className="player">
          <span className="who">{reciterName(current)} · {playing.ayah}</span>
          <select value={speed} onChange={e => changeSpeed(Number(e.target.value))} aria-label="Speed">
            {SPEEDS.map(v => <option key={v} value={v}>{v}x</option>)}
          </select>
          <label className="auto"><input type="checkbox" checked={continuous} onChange={toggleContinuous} /> {t.auto}</label>
          <button onClick={stop}>{t.pause}</button>
          <button onClick={next}>{t.next}</button>
        </div>
      )}

      {tafsirAyah && surah && (
        <div className="overlay" onClick={() => setTafsirAyah(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h2>{t.tafsir} <small>({surahName(surah)} {tafsirAyah})</small></h2>
            <p className="tafsir-ayah">{ayahs.find(a => a.number === tafsirAyah)?.ar}</p>
            <div className="tafsir-bar">
              <select value={tafsirId} onChange={e => changeTafsir(Number(e.target.value))}>
                {TAFSIRS.map(x => <option key={x.id} value={x.id}>{lang === 'ar' ? x.ar : x.en}</option>)}
              </select>
              <button className="ghost" onClick={() => setTafsirAyah(null)}>{t.close}</button>
            </div>
            {tafsirText.state === 'loading' && <p className="msg">{t.tafsirLoading}</p>}
            {tafsirText.state === 'error' && <p className="msg err">{t.error}</p>}
            {tafsirText.state === 'ok' && (
              <div className={'tafsir-text ' + TAFSIRS.find(x => x.id === tafsirId).dir}>{tafsirText.text || t.tafsirEmpty}</div>
            )}
          </div>
        </div>
      )}

      {selected && surah && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h2>{t.choose} <small>({surah.englishName} {selected})</small></h2>
            <ul>
              {RECITERS.map(r => (
                <li key={r.id} className={r.id === reciter ? 'active' : ''} onClick={() => pickReciter(r.id)}>
                  <span>{reciterName(r)}</span><span>▶</span>
                </li>
              ))}
            </ul>
            <div className="sheet-actions">
              <button className="ghost" onClick={openTafsir}>📖 {t.tafsir}</button>
              <button className="ghost" onClick={() => { toggleBookmark(surah.number, selected); setSelected(null); }}>
                {isMarked(surah.number, selected) ? `★ ${t.unbookmark}` : `☆ ${t.bookmark}`}
              </button>
              <button className="ghost" onClick={() => setSelected(null)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
