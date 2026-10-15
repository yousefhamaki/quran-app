import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { AyahText } from '../lib/dailyayah';

interface Props {
  ayah: AyahText | null;
}

/** "Ayah of the day" for the Android home screen. */
export function AyahWidget({ ayah }: Props) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: ayah ? `quranapp://surah/${ayah.ref.surah}?ayah=${ayah.ref.ayah}` : 'quranapp://' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#0b5d4b', borderRadius: 24, padding: 16, justifyContent: 'center', flexDirection: 'column' }}
    >
      <TextWidget text="آية اليوم" style={{ fontSize: 12, color: '#d8c27a' }} />
      <TextWidget text={ayah ? ayah.ar : 'القرآن الكريم'} maxLines={5} style={{ fontSize: 17, color: '#ffffff' }} />
      {ayah ? <TextWidget text={`${ayah.surahAr} · ${ayah.ref.ayah}`} style={{ fontSize: 12, color: '#cfe8df' }} /> : null}
    </FlexWidget>
  );
}
