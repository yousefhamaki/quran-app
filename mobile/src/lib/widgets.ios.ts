import { addDays, dateString } from './habit';
import { ayahOfDayText } from './dailyayah';
import { buildWidgetData, inputsFromApp } from './widget-data';
import AyahWidget from '../widgets/ayah-widget.ios';
import PrayerRing from '../widgets/prayer-ring.ios';
import PrayerTimes from '../widgets/prayer-times.ios';
import NextPrayer from '../widgets/next-prayer.ios';
import HijriEvents from '../widgets/hijri-events.ios';
import ReadingStreak from '../widgets/reading-streak.ios';
import KhatmahProgress from '../widgets/khatmah-progress.ios';
import ContinueReading from '../widgets/continue-reading.ios';
import AdhkarNow from '../widgets/adhkar-now.ios';

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
  if (entries.length > 0) AyahWidget.updateTimeline(entries);
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
  PrayerRing.updateTimeline(entries);
  PrayerTimes.updateTimeline(entries);
  NextPrayer.updateTimeline(entries);
  // Reading widgets: the same snapshots (the adhkar switch from morning to evening at Asr, the week rolls over at midnight).
  ReadingStreak.updateTimeline(entries);
  KhatmahProgress.updateTimeline(entries);
  ContinueReading.updateTimeline(entries);
  AdhkarNow.updateTimeline(entries);

  // Occasions only change at midnight.
  const days = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (i > 0) d.setHours(0, 0, 5, 0);
    days.push({ date: i === 0 ? new Date() : d, props: buildWidgetData(inputs, d) });
  }
  HijriEvents.updateTimeline(days);
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
