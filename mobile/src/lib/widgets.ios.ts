import { addDays, dateString } from './habit';
import { ayahOfDayText } from './dailyayah';
import { buildWidgetData, inputsFromApp } from './widget-data';


type TimelineWidget = { updateTimeline: (entries: { date: Date; props: object }[]) => void };

/**
 * The widgets are loaded only when they are refreshed (and one that fails to load is skipped), so a problem in a widget
 * can never stop the app from opening.
 */
function widget(name: string): TimelineWidget | null {
  try {
    switch (name) {
      case 'AyahOfDay': return require('../widgets/ayah-widget.ios').default;
      case 'PrayerRing': return require('../widgets/prayer-ring.ios').default;
      case 'PrayerTimes': return require('../widgets/prayer-times.ios').default;
      case 'NextPrayer': return require('../widgets/next-prayer.ios').default;
      case 'HijriEvents': return require('../widgets/hijri-events.ios').default;
      case 'ReadingStreak': return require('../widgets/reading-streak.ios').default;
      case 'KhatmahProgress': return require('../widgets/khatmah-progress.ios').default;
      case 'ContinueReading': return require('../widgets/continue-reading.ios').default;
      case 'AdhkarNow': return require('../widgets/adhkar-now.ios').default;
    }
  } catch {
    /* this widget is not available in this build */
  }
  return null;
}

const push = (name: string, entries: { date: Date; props: object }[]) => {
  try {
    widget(name)?.updateTimeline(entries);
  } catch {
    /* not set up */
  }
};

const DAYS_AHEAD = 7;
/** The ring fills as time goes by, so give the prayer widgets a fresh entry this often (the countdown itself ticks on its own). */
const STEP_MINUTES = 15;
const PRAYER_HOURS_AHEAD = 36;

/** Give the iOS widget one entry per coming day, so it changes ayah at midnight even if the app is not opened. */
async function refreshAyah() {
  const today = dateString();
  const entries = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const text = await ayahOfDayText(day);
    if (!text) continue;
    const [y, m, d] = day.split('-').map(Number);
    entries.push({ date: i === 0 ? new Date() : new Date(y, m - 1, d, 0, 0, 5), props: { ar: text.ar, label: `${text.surahAr} · ${text.ref.ayah}` } });
  }
  if (entries.length > 0) push('AyahOfDay', entries);
}

/**
 * The prayer widgets get a timeline of snapshots (every 15 minutes and at each prayer) for the next day and a half,
 * so they stay right while the app is closed; the app tops it up every time it opens.
 */
function refreshPrayerWidgets() {
  const inputs = inputsFromApp();
  const start = Date.now();
  const stamps = new Set<number>([start]);
  for (let m = STEP_MINUTES; m <= PRAYER_HOURS_AHEAD * 60; m += STEP_MINUTES) stamps.add(start + m * 60_000);
  if (inputs.loc) {
    // Land exactly on each prayer so the "next prayer" flips on time.
    let cursor = new Date(start);
    for (let i = 0; i < 9; i++) {
      const snap = buildWidgetData(inputs, cursor, 0);
      if (!snap.next || snap.next.at > start + PRAYER_HOURS_AHEAD * 3_600_000) break;
      stamps.add(snap.next.at + 1000);
      cursor = new Date(snap.next.at + 2000);
    }
  }
  const entries = [...stamps].sort((a, b) => a - b).map(t => ({ date: new Date(t), props: buildWidgetData(inputs, new Date(t)) }));
  push('PrayerRing', entries);
  push('PrayerTimes', entries);
  push('NextPrayer', entries);
  // Reading widgets: the same snapshots (the adhkar switch from morning to evening at Asr, the week rolls over at midnight).
  push('ReadingStreak', entries);
  push('KhatmahProgress', entries);
  push('ContinueReading', entries);
  push('AdhkarNow', entries);

  // Occasions only change at midnight.
  const days = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (i > 0) d.setHours(0, 0, 5, 0);
    days.push({ date: i === 0 ? new Date() : d, props: buildWidgetData(inputs, d) });
  }
  push('HijriEvents', days);
}

export async function refreshWidgets(): Promise<void> {
  try {
    refreshPrayerWidgets();
  } catch {
    /* widget not set up (e.g. a build without the extension) */
  }
  try {
    await refreshAyah();
  } catch {
    /* offline or no extension */
  }
}
