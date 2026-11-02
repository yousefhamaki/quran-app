import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ArrowRight, BedDouble, Check, ChevronDown, CloudSun, Compass, Crosshair, MapPin, Moon, MoonStar, Sun, SunMedium, Sunrise, Sunset } from 'lucide-react-native';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, RAMADAN } from '@/lib/hijri';
import { AppHeader } from '@/components/app-header';
import { Chips } from '@/components/chips';
import { SwitchRow } from '@/components/controls';
import { PrayerRing } from '@/components/prayer-ring';
import { QiblaCompass } from '@/components/qibla-compass';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { TKey } from '@/lib/i18n';
import { ADHAN_PRAYERS, addMinutes, distanceToKaaba, formatTime, ishraqAt, METHODS, nightTimes, qiblaBearing, turnToward, type IqamaMinutes, type MadhabId } from '@/lib/prayer';
import { ADHAN_DAYS, testAdhanNotification } from '@/lib/reminders';
import { PRAYER_KEYS, usePrayer } from '@/context/prayer';
import { useSettings } from '@/context/settings';

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn('gap-3 rounded-2xl border border-border bg-card p-4', className)}>{children}</View>;
}

/** The device's compass heading (degrees from north), or null when there is no compass. */
/**
 * iOS reports the compass heading for a portrait screen, whichever way the screen is turned. On a tablet (which turns
 * freely) the heading has to be rotated with the screen, or the compass is a quarter turn off in landscape.
 * "Interface" left/right are named by the home button: left = the top of the device points to the right.
 */
function useScreenRotation(active: boolean): number {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    if (!active || Platform.OS !== 'ios') return;
    const apply = (o: ScreenOrientation.Orientation) =>
      setRotation(o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ? -90 : o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT ? 90 : o === ScreenOrientation.Orientation.PORTRAIT_DOWN ? 180 : 0);
    void ScreenOrientation.getOrientationAsync().then(apply).catch(() => {});
    const sub = ScreenOrientation.addOrientationChangeListener(e => apply(e.orientationInfo.orientation));
    return () => ScreenOrientation.removeOrientationChangeListener(sub);
  }, [active]);
  return rotation;
}

function useHeading(active: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        sub = await Location.watchHeadingAsync(h => {
          const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setHeading(prev => (prev !== null && Math.abs(prev - value) < 1 ? prev : value));
        });
        if (cancelled) sub.remove();
      } catch {
        setHeading(null);
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [active]);
  return heading;
}

type Tab = 'now' | 'times' | 'qibla' | 'settings';
const TABS: { id: Tab; label: TKey }[] = [
  { id: 'now', label: 'prayerTabNow' },
  { id: 'times', label: 'prayerTabTimes' },
  { id: 'qibla', label: 'prayerTabQibla' },
  { id: 'settings', label: 'prayerTabSettings' },
];

export default function PrayerScreen() {
  const router = useRouter();
  const { t, isRTL, settings } = useSettings();
  const prayer = usePrayer();
  const { loc, times, next, method, madhab, adhan, adhanStatus, hijri, hijriAdjust } = prayer;
  const locale = isRTL ? 'ar' : 'en';
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => (TABS.some(x => x.id === tabParam) ? (tabParam as Tab) : 'now'));
  useEffect(() => { if (TABS.some(x => x.id === tabParam)) setTab(tabParam as Tab); }, [tabParam]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState(() => (loc ? String(loc.lat) : ''));
  const [lng, setLng] = useState(() => (loc ? String(loc.lng) : ''));
  const [picking, setPicking] = useState(false);
  const [manual, setManual] = useState(false);
  // The position is detected by itself: asking for it is the only thing this screen does when there is none yet.
  useEffect(() => { if (!loc) void prayer.refreshLocation(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rawHeading = useHeading(!!loc && tab === 'qibla');
  const screenRotation = useScreenRotation(!!loc && tab === 'qibla');
  const heading = rawHeading === null ? null : (rawHeading + screenRotation + 360) % 360;

  // After "Use my location" the coordinate fields follow the new position.
  useEffect(() => {
    if (loc) { setLat(String(Number(loc.lat.toFixed(4)))); setLng(String(Number(loc.lng.toFixed(4)))); }
  }, [loc?.lat, loc?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const turn = heading === null ? null : turnToward(heading, bearing);
  const facing = turn !== null && Math.abs(turn) < 5;
  const methodName = (id: string) => { const m = METHODS.find(x => x.id === id); return m ? (isRTL ? m.ar : m.en) : id; };
  // One row per time of the day, like a prayer-times table: name, icon, time and a second line (iqama / ishraq).
  const rows = useMemo(() => {
    if (!loc || !times) return [];
    const night = nightTimes(loc, new Date(), method, madhab);
    const iq = (k: keyof IqamaMinutes) => ({ label: t('iqamaLabel'), at: addMinutes(times[k], prayer.iqama[k]) });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, times, method, madhab, prayer.iqama, t]);

  const locationCta = prayer.locationStatus === 'denied' ? (
    <View className="gap-3 rounded-3xl bg-secondary p-5">
      <Text accessibilityRole="header" className="text-lg font-semibold">{t('locationDeniedTitle')}</Text>
      <Text className="text-sm leading-6 text-secondary-foreground">{t('locationDeniedHint')}</Text>
      <Button size="lg" className="h-12 rounded-xl" onPress={() => void Linking.openSettings()}>
        <Icon as={MapPin} className="size-5 text-primary-foreground" />
        <Text className="text-base">{t('locationOpenSettings')}</Text>
      </Button>
      <Button variant="ghost" className="h-11 rounded-xl" onPress={() => void prayer.refreshLocation(true)}>
        <Text>{t('locationTryAgain')}</Text>
      </Button>
    </View>
  ) : (
    <View className="items-center gap-3 rounded-3xl bg-secondary p-6">
      <Icon as={Crosshair} className="size-8 text-primary" />
      <Text accessibilityLiveRegion="polite" className="text-center text-base text-secondary-foreground">{t('locationDetecting')}</Text>
      <Button variant="ghost" className="h-11 rounded-xl" onPress={() => void prayer.refreshLocation(true)}>
        <Text>{t('locationTryAgain')}</Text>
      </Button>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={t('prayerTitle')} />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-56 pt-4" keyboardShouldPersistTaps="handled">
        <View accessibilityRole="tablist" className="flex-row gap-1 rounded-full bg-muted p-1">
          {TABS.map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              className={cn('h-10 flex-1 items-center justify-center rounded-full px-1', tab === id && 'bg-background')}
            >
              <Text numberOfLines={1} className={cn('text-sm font-medium', tab === id ? 'text-foreground' : 'text-muted-foreground')}>{t(label)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Prayers: the live countdown */}
        {tab === 'now' ? (loc && times && next ? <PrayerRing loc={loc} method={method} madhab={madhab} hijriAdjust={hijriAdjust} times={times} /> : locationCta) : null}

        {/* Times: the whole day as a table */}
        {tab === 'times' ? (loc && times && next ? (
          <View className="gap-3" accessibilityLabel={t('prayerTabTimes')}>
            <Text className="text-center text-sm text-muted-foreground">{loc.name ?? new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            <View className="overflow-hidden rounded-3xl border border-border bg-card">
              {rows.map((r, i) => {
                const current = r.id === next.name;
                return (
                  <View key={r.id} className={cn('flex-row items-center gap-4 px-5 py-3.5', i > 0 && 'border-t border-border', current && 'bg-gold/10')}>
                    <Text className={cn('flex-1 text-xl font-semibold', isRTL && 'font-quran')} style={isRTL ? { lineHeight: 44, paddingVertical: 4 } : undefined}>{r.name}</Text>
                    <View className="size-12 items-center justify-center rounded-full bg-muted">
                      <Icon as={r.icon} className={cn('size-6', current ? 'text-gold' : 'text-muted-foreground')} />
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-2xl font-semibold" style={{ writingDirection: 'ltr', lineHeight: 42, paddingVertical: 3 }}>{formatTime(r.at, locale)}</Text>
                      {r.sub ? <Text className="text-sm text-muted-foreground">{r.sub.label}: <Text className="text-sm text-muted-foreground" style={{ writingDirection: 'ltr' }}>{formatTime(r.sub.at, locale)}</Text></Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : locationCta) : null}

        {/* Qibla */}
        {tab === 'qibla' ? (loc ? (
          <Panel className="items-center gap-3 rounded-3xl p-5">
            <View className="flex-row items-center gap-2">
              <Icon as={Compass} className="size-4 text-muted-foreground" />
              <Text className="text-sm font-medium text-muted-foreground">{t('qiblaTitle')}</Text>
            </View>
            <QiblaCompass bearing={bearing} heading={heading} facing={facing} label={t('qiblaBearing', { deg: Math.round(bearing) })} />
            <Text className="text-lg font-semibold">{t('qiblaBearing', { deg: Math.round(bearing) })}</Text>
            <Text className="text-sm text-muted-foreground">{t('qiblaDistance', { km: Math.round(distanceToKaaba(loc)).toLocaleString(locale) })}</Text>
            {turn === null ? (
              <Text className="text-center text-xs text-muted-foreground">{t('qiblaNoCompass')}</Text>
            ) : facing ? (
              <Text accessibilityLiveRegion="polite" className="font-medium text-primary">{t('qiblaFacing')}</Text>
            ) : (
              <Text accessibilityLiveRegion="polite" className="text-sm">{turn < 0 ? t('qiblaTurnLeft', { deg: Math.round(Math.abs(turn)) }) : t('qiblaTurnRight', { deg: Math.round(turn) })}</Text>
            )}
            {heading !== null ? <Text className="text-center text-xs text-muted-foreground">{t('qiblaCalibrate')}</Text> : null}
          </Panel>
        ) : locationCta) : null}

        {/* Settings */}
        {tab === 'settings' ? (
          <>
            <Panel className="gap-4 rounded-3xl p-5">
              <View className="flex-row items-start gap-3">
                <View className="size-11 items-center justify-center rounded-xl bg-secondary">
                  <Icon as={MapPin} className="size-5 text-primary" />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text accessibilityRole="header" className="font-medium">{t('locationAutoTitle')}</Text>
                  <Text className="text-base">{loc?.name ?? t('locationDetecting')}</Text>
                  {loc ? <Text className="text-xs text-muted-foreground" style={{ writingDirection: 'ltr', textAlign: isRTL ? 'right' : 'left' }}>{loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}</Text> : null}
                </View>
              </View>
              <Text className="text-xs leading-5 text-muted-foreground">{t('locationAutoHint')}</Text>
              {prayer.locationStatus === 'denied' ? (
                <Button className="h-11 rounded-xl" onPress={() => void Linking.openSettings()}>
                  <Text>{t('locationOpenSettings')}</Text>
                </Button>
              ) : (
                <Button variant="outline" className="h-11 rounded-xl" disabled={busy} onPress={() => void useMyLocation()}>
                  <Icon as={Crosshair} className="size-4" />
                  <Text>{busy ? t('prayerLocating') : t('locationRefresh')}</Text>
                </Button>
              )}
              {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
              <Pressable onPress={() => setManual(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: manual }} className="min-h-11 flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">{t('locationManual')}</Text>
                <Icon as={ChevronDown} className={cn('size-4 text-muted-foreground', manual && 'rotate-180')} />
              </Pressable>
              {manual ? (
                <View className="gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1.5">
                      <Text className="text-sm font-medium">{t('prayerLat')}</Text>
                      <Input value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" placeholder="30.0444" className="h-11 rounded-xl" style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                    </View>
                    <View className="flex-1 gap-1.5">
                      <Text className="text-sm font-medium">{t('prayerLng')}</Text>
                      <Input value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" placeholder="31.2357" className="h-11 rounded-xl" style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                    </View>
                  </View>
                  <Button variant="outline" className="h-11 rounded-xl" disabled={!coordsOk} onPress={() => prayer.setLocation({ lat: latN, lng: lngN })}>
                    <Text>{t('prayerSetCoords')}</Text>
                  </Button>
                </View>
              ) : null}
            </Panel>

            <Panel className="gap-4 rounded-3xl p-5">
              <SwitchRow label={t('adhanHeading')} hint={`${t('adhanHint')} ${t('adhanSoundNote')}`} checked={adhan} onChange={prayer.setAdhan} disabled={!loc} />
              {adhan ? (
                <>
                  <View className="gap-1">
                    <Text accessibilityRole="header" className="text-sm font-medium">{t('adhanWhich')}</Text>
                    <Text className="text-xs leading-5 text-muted-foreground">{t('adhanWhichHint')}</Text>
                  </View>
                  {ADHAN_PRAYERS.map(k => (
                    <SwitchRow key={k} label={t(PRAYER_KEYS[k])} checked={prayer.alerts[k]} onChange={on => prayer.setAlert(k, on)} />
                  ))}
                  <Text accessibilityRole="header" className="pt-2 text-sm font-medium">{t('adhanExtras')}</Text>
                  <SwitchRow label={t('alertSunrise')} hint={t('alertSunriseHint')} checked={prayer.alerts.sunrise} onChange={on => prayer.setAlert('sunrise', on)} />
                  <SwitchRow label={t('alertIshraq')} hint={t('alertIshraqHint')} checked={prayer.alerts.ishraq} onChange={on => prayer.setAlert('ishraq', on)} />
                  <SwitchRow label={t('alertQiyam')} hint={t('alertQiyamHint')} checked={prayer.alerts.qiyam} onChange={on => prayer.setAlert('qiyam', on)} />
                  <SwitchRow label={t('adhanBeforeLabel')} checked={prayer.before} onChange={prayer.setBefore} />
                  {prayer.before ? (
                    <View className="gap-2">
                      <Text className="text-sm font-medium">{t('adhanBeforeMinutes')}</Text>
                      <Chips<number> label={t('adhanBeforeMinutes')} value={prayer.beforeMinutes} onChange={prayer.setBeforeMinutes} options={[5, 10, 15, 20, 30].map(n => ({ value: n, label: t('iqamaMinutes', { n }) }))} />
                    </View>
                  ) : null}
                </>
              ) : null}
              {adhan ? (
                <View className="gap-2">
                  <Button variant="outline" className="h-11 rounded-xl" onPress={() => void testAdhanNotification({ channelName: t('adhanHeading'), title: t('prayerDhuhr'), body: t('adhanTestBody') })}>
                    <Icon as={Moon} className="size-4" />
                    <Text>{t('adhanTest')}</Text>
                  </Button>
                  <Text className="text-xs leading-5 text-muted-foreground">{t('adhanFullNote')}</Text>
                </View>
              ) : null}
              {adhan && adhanStatus === 'scheduled' ? <Text className="text-xs text-muted-foreground">{t('adhanScheduled', { n: ADHAN_DAYS })}</Text> : null}
              {adhan && adhanStatus === 'denied' ? <Text accessibilityRole="alert" className="text-sm text-destructive">{t('reminderDenied')}</Text> : null}
              {!loc ? <Text className="text-xs text-muted-foreground">{t('prayerNoLocation')}</Text> : null}
            </Panel>

            <Panel className="gap-4 rounded-3xl p-5">
              <View className="gap-2">
                <Text className="text-sm font-medium">{t('prayerMethod')}</Text>
                <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={t('prayerMethod')} className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-background px-4 active:bg-accent">
                  <Text numberOfLines={1} className="flex-1">{prayer.methodAuto ? `${t('methodAuto')} · ${methodName(method)}` : methodName(method)}</Text>
                  <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
                </Pressable>
              </View>
              <View className="gap-2">
                <Text className="text-sm font-medium">{t('prayerMadhab')}</Text>
                <Chips<MadhabId> label={t('prayerMadhab')} value={madhab} onChange={prayer.setMadhab} options={[{ value: 'shafi', label: t('madhabShafi') }, { value: 'hanafi', label: t('madhabHanafi') }]} />
              </View>
              <Text className="text-xs leading-5 text-muted-foreground">{t('prayerAccuracy')}</Text>
            </Panel>

            <Panel className="gap-4 rounded-3xl p-5">
              <Text accessibilityRole="header" className="font-medium">{t('tuneHeading')}</Text>
              {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(k => (
                <View key={k} className="flex-row items-center gap-3">
                  <Text className="w-20 text-sm font-medium">{t(PRAYER_KEYS[k])}</Text>
                  <View className="flex-1">
                    <Stepper label={`${t('tuneHeading')} ${t(PRAYER_KEYS[k])}`} value={prayer.tune[k]} min={-15} max={15} onChange={v => prayer.setTune(k, v)} />
                  </View>
                </View>
              ))}
              <Text className="text-xs leading-5 text-muted-foreground">{t('tuneHint')}</Text>
            </Panel>

            <Panel className="gap-4 rounded-3xl p-5">
              <Text accessibilityRole="header" className="font-medium">{t('iqamaSettings')}</Text>
              {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(k => (
                <View key={k} className="flex-row items-center gap-3">
                  <Text className="w-20 text-sm font-medium">{t(PRAYER_KEYS[k])}</Text>
                  <View className="flex-1">
                    <Stepper label={`${t('iqamaLabel')} ${t(PRAYER_KEYS[k])}`} value={prayer.iqama[k]} min={0} max={90} onChange={v => prayer.setIqama(k, v)} />
                  </View>
                </View>
              ))}
              <Text className="text-xs leading-5 text-muted-foreground">{t('iqamaHint')}</Text>
            </Panel>

            <Pressable onPress={() => router.push('/calendar')} accessibilityRole="button" className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:border-primary">
              <View className="size-11 items-center justify-center rounded-xl bg-secondary">
                <Icon as={MoonStar} className="size-6 text-primary" />
              </View>
              <View className="flex-1">
                <Text className="font-medium">{hijri.month === RAMADAN ? t('ramadanGreeting') : t('calendarTitle')}</Text>
                <Text numberOfLines={1} className="text-sm text-muted-foreground">
                  {hijri.day.toLocaleString(locale, { useGrouping: false })} {(isRTL ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)[hijri.month - 1]} {hijri.year.toLocaleString(locale, { useGrouping: false })}
                </Text>
              </View>
              <Icon as={ArrowRight} className="size-5 text-muted-foreground rtl:rotate-180" />
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <Sheet open={picking} tall onClose={() => setPicking(false)} title={t('prayerMethod')}>
        <View className="gap-1 pb-4">
          <Pressable
            onPress={() => { prayer.chooseMethod('auto'); setPicking(false); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: prayer.methodAuto }}
            className={cn('min-h-14 flex-row items-center gap-3 rounded-xl px-3 active:bg-accent', prayer.methodAuto && 'bg-accent')}
          >
            <View className="flex-1">
              <Text className="font-medium">{t('methodAuto')}</Text>
              <Text className="text-xs text-muted-foreground">{t('methodAutoHint')}</Text>
            </View>
            {prayer.methodAuto ? <Icon as={Check} className="size-4 text-primary" /> : null}
          </Pressable>
          {METHODS.map(m => {
            const selected = !prayer.methodAuto && m.id === method;
            return (
              <Pressable
                key={m.id}
                onPress={() => { prayer.chooseMethod(m.id); setPicking(false); }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={cn('min-h-12 flex-row items-center gap-3 rounded-xl px-3 active:bg-accent', selected && 'bg-accent')}
              >
                <Text className="flex-1">{isRTL ? m.ar : m.en}</Text>
                {selected ? <Icon as={Check} className="size-4 text-primary" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
