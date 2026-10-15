import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BedDouble, Clock, CloudSun, Compass, Crosshair, MapPin, Moon, MoonStar, SlidersHorizontal, Sun, SunMedium, Sunrise, Sunset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PrayerRing } from '@/components/prayer-ring';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import type { Page } from '@/hooks/use-hash-route';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, RAMADAN } from '@/lib/hijri';
import { addMinutes, distanceToKaaba, formatTime, ishraqAt, METHODS, nightTimes, qiblaBearing, type IqamaMinutes, type MethodId, type PrayerName } from '@/lib/prayer';
import { usePrayer } from '@/context/prayer';
import { useSettings } from '@/context/settings';

export const PRAYER_KEYS: Record<PrayerName, TKey> = {
  fajr: 'prayerFajr',
  sunrise: 'prayerSunrise',
  dhuhr: 'prayerDhuhr',
  asr: 'prayerAsr',
  maghrib: 'prayerMaghrib',
  isha: 'prayerIsha',
};

type Tab = 'now' | 'times' | 'qibla' | 'settings';
const TABS: { id: Tab; icon: typeof Clock; label: TKey }[] = [
  { id: 'now', icon: Clock, label: 'prayerTabNow' },
  { id: 'times', icon: Clock, label: 'prayerTabTimes' },
  { id: 'qibla', icon: Compass, label: 'prayerTabQibla' },
  { id: 'settings', icon: SlidersHorizontal, label: 'prayerTabSettings' },
];

export function PrayerPage({ onOpenPage, initialTab }: { onOpenPage: (page: Page) => void; /** Open on "now", "times", "qibla" or "settings". */ initialTab?: string | null }) {
  const { settings, t } = useSettings();
  const prayer = usePrayer();
  const { loc, times, next, method, madhab, hijri, hijriAdjust } = prayer;
  const ar = settings.lang === 'ar';
  const locale = ar ? 'ar' : 'en';
  const [tab, setTab] = useState<Tab>(() => (TABS.some(x => x.id === initialTab) ? (initialTab as Tab) : 'now'));
  useEffect(() => { if (TABS.some(x => x.id === initialTab)) setTab(initialTab as Tab); }, [initialTab]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState(() => (loc ? String(loc.lat) : ''));
  const [lng, setLng] = useState(() => (loc ? String(loc.lng) : ''));

  const useMyLocation = async () => {
    setBusy(true);
    setError(null);
    const result = await prayer.locate(settings.lang);
    setBusy(false);
    if (result !== 'ok') setError(t('prayerLocDenied'));
  };

  const latN = Number(lat);
  const lngN = Number(lng);
  const coordsOk = lat.trim() !== '' && lng.trim() !== '' && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180;
  const bearing = loc ? qiblaBearing(loc) : 0;

  const locationCta = (
    <div className="space-y-3 rounded-3xl bg-secondary p-5">
      <p className="text-sm text-secondary-foreground">{t('prayerNoLocation')}</p>
      <Button className="h-12 w-full gap-2 rounded-xl text-base" disabled={busy} onClick={() => void useMyLocation()}>
        <Crosshair className="size-5" aria-hidden /> {busy ? t('prayerLocating') : t('prayerUseLocation')}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );

  // One row per time of the day, like a prayer-times table: name, icon, time and a second line (iqama / ishraq).
  const rows = useMemo(() => {
    if (!loc || !times) return [];
    const night = nightTimes(loc, new Date(), method, madhab);
    const iq = (p: keyof IqamaMinutes) => ({ label: t('iqamaLabel'), at: addMinutes(times[p], prayer.iqama[p]) });
    return [
      { id: 'fajr', name: t('prayerFajr'), icon: Sunrise, at: times.fajr, sub: iq('fajr') },
      { id: 'sunrise', name: t('prayerSunrise'), icon: SunMedium, at: times.sunrise, sub: { label: t('ishraqLabel'), at: ishraqAt(times.sunrise) } },
      { id: 'dhuhr', name: t('prayerDhuhr'), icon: Sun, at: times.dhuhr, sub: iq('dhuhr') },
      { id: 'asr', name: t('prayerAsr'), icon: CloudSun, at: times.asr, sub: iq('asr') },
      { id: 'maghrib', name: t('prayerMaghrib'), icon: Sunset, at: times.maghrib, sub: iq('maghrib') },
      { id: 'isha', name: t('prayerIsha'), icon: MoonStar, at: times.isha, sub: iq('isha') },
      { id: 'midnight', name: t('prayerMidnight'), icon: Moon, at: night.midnight, sub: null },
      { id: 'lastThird', name: t('prayerLastThird'), icon: BedDouble, at: night.lastThird, sub: null },
    ];
  }, [loc, times, method, madhab, prayer.iqama, t]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-4 pb-32">
      <div role="tablist" aria-label={t('prayerTitle')} className="flex gap-1 rounded-full bg-muted p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('h-10 flex-1 rounded-full px-2 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {/* Prayers: the live countdown */}
      {tab === 'now' && (loc && times && next ? <PrayerRing loc={loc} method={method} madhab={madhab} hijriAdjust={hijriAdjust} times={times} /> : locationCta)}

      {/* Times: the whole day as a table */}
      {tab === 'times' && (loc && times && next ? (
        <section aria-label={t('prayerTabTimes')} className="space-y-3">
          <p className="text-center text-sm text-muted-foreground" dir="auto">{loc.name ?? new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <Card className="gap-0 overflow-hidden rounded-3xl p-0">
            <ul className="divide-y">
              {rows.map(r => {
                const current = r.id === next.name;
                return (
                  <li key={r.id} className={cn('grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3.5', current && 'bg-gold/10')}>
                    <span className={cn('text-xl font-semibold break-words', ar && 'ar-safe font-quran leading-[1.9]')}>{r.name}</span>
                    <span className={cn('grid size-12 shrink-0 place-items-center rounded-full bg-muted', current ? 'text-gold' : 'text-muted-foreground')} aria-hidden>
                      <r.icon className="size-6" />
                    </span>
                    <span className="justify-self-end text-end">
                      <span dir="ltr" className="block text-2xl font-semibold tabular-nums">{formatTime(r.at, locale)}</span>
                      {r.sub && <span className="block text-sm text-muted-foreground"><bdi>{r.sub.label}</bdi>: <bdi dir="ltr" className="tabular-nums">{formatTime(r.sub.at, locale)}</bdi></span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      ) : locationCta)}

      {/* Qibla */}
      {tab === 'qibla' && (loc ? (
        <Card className="items-center gap-3 rounded-3xl p-5 text-center">
          <div className="relative grid size-44 place-items-center rounded-full border-2 border-border" role="img" aria-label={t('qiblaBearing', { deg: Math.round(bearing) })}>
            <span className="absolute top-1 text-xs font-medium text-muted-foreground">N</span>
            <div className="absolute inset-4 transition-transform" style={{ transform: `rotate(${bearing}deg)` }}>
              <div className="mx-auto h-1/2 w-1.5 rounded-full bg-primary" />
              <div className="absolute -top-1 left-1/2 size-4 -translate-x-1/2 rotate-45 border-t-4 border-l-4 border-primary" />
            </div>
            <span className="size-3 rounded-full bg-foreground" aria-hidden />
          </div>
          <p className="text-lg font-semibold tabular-nums">{t('qiblaBearing', { deg: Math.round(bearing) })}</p>
          <p className="text-sm text-muted-foreground">{t('qiblaDistance', { km: Math.round(distanceToKaaba(loc)).toLocaleString(locale) })}</p>
          <p className="text-xs text-muted-foreground">{t('qiblaNoCompass')}</p>
        </Card>
      ) : locationCta)}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="space-y-5">
          <Card className="gap-4 rounded-3xl p-5">
            <h2 className="flex items-center gap-2 font-medium">
              <MapPin className="size-4 text-primary" aria-hidden /> {t('prayerLocation')}
              {loc?.name ? <span className="font-normal text-muted-foreground"> · {loc.name}</span> : null}
            </h2>
            <Button className="h-12 w-full gap-2 rounded-xl text-base" disabled={busy} onClick={() => void useMyLocation()}>
              <Crosshair className="size-5" aria-hidden /> {busy ? t('prayerLocating') : t('prayerUseLocation')}
            </Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat">{t('prayerLat')}</Label>
                <Input id="lat" dir="ltr" inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} placeholder="30.0444" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng">{t('prayerLng')}</Label>
                <Input id="lng" dir="ltr" inputMode="decimal" value={lng} onChange={e => setLng(e.target.value)} placeholder="31.2357" className="h-11 rounded-xl" />
              </div>
            </div>
            <Button variant="outline" className="h-11 rounded-xl" disabled={!coordsOk} onClick={() => prayer.setLocation({ lat: latN, lng: lngN })}>{t('prayerSetCoords')}</Button>
          </Card>

          <Card className="gap-4 rounded-3xl p-5">
            <div className="space-y-2">
              <Label htmlFor="method">{t('prayerMethod')}</Label>
              <Select value={method} onValueChange={v => prayer.setMethod(v as MethodId)}>
                <SelectTrigger id="method" className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {METHODS.map(m => <SelectItem key={m.id} value={m.id}>{ar ? m.ar : m.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('prayerMadhab')}</Label>
              <ToggleGroup type="single" variant="outline" value={madhab} onValueChange={v => (v === 'shafi' || v === 'hanafi') && prayer.setMadhab(v)} className="flex w-full justify-start gap-2" aria-label={t('prayerMadhab')}>
                <ToggleGroupItem value="shafi" className="h-11 rounded-full! border! px-4 text-sm shadow-none">{t('madhabShafi')}</ToggleGroupItem>
                <ToggleGroupItem value="hanafi" className="h-11 rounded-full! border! px-4 text-sm shadow-none">{t('madhabHanafi')}</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <p className="text-xs text-muted-foreground">{t('prayerAccuracy')}</p>
            <p className="text-xs text-muted-foreground">{t('adhanWebNote')}</p>
          </Card>

          <Card className="gap-4 rounded-3xl p-5">
            <h2 className="font-medium">{t('iqamaSettings')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(p => (
                <div key={p} className="space-y-1.5">
                  <Label htmlFor={`iqama-${p}`}>{t(PRAYER_KEYS[p])}</Label>
                  <Input id={`iqama-${p}`} type="number" inputMode="numeric" min={0} max={90} value={prayer.iqama[p]} onChange={e => prayer.setIqama(p, Number(e.target.value) || 0)} className="h-11 rounded-xl" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('iqamaHint')}</p>
          </Card>

          <button type="button" onClick={() => onOpenPage('calendar')} className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-start transition-colors hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary" aria-hidden><MoonStar className="size-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{hijri.month === RAMADAN ? t('ramadanGreeting') : t('calendarTitle')}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {hijri.day.toLocaleString(locale, { useGrouping: false })} {(ar ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)[hijri.month - 1]} {hijri.year.toLocaleString(locale, { useGrouping: false })}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
