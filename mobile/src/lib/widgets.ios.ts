import { addDays, dateString } from './habit';
import { ayahOfDayText } from './dailyayah';
import AyahWidget from '../widgets/ayah-widget.ios';

const DAYS_AHEAD = 7;

/** Give the iOS widget one entry per coming day, so it changes ayah at midnight even if the app is not opened. */
export async function refreshWidgets(): Promise<void> {
  try {
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
  } catch {
    /* widget not set up (e.g. a build without the extension) */
  }
}
