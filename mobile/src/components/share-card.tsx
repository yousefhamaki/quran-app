import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Text } from '@/components/ui/text';

export interface ShareCardData {
  ar: string;
  translation?: string;
  translationRtl?: boolean;
  reference: string;
}

interface Props extends ShareCardData {
  onDone: (ok: boolean) => void;
}

const SIZE = 1080 / 3; // laid out at 360dp wide, captured at 3x

/**
 * Draws the ayah card off-screen, captures it as a PNG and opens the system share sheet.
 * Colours are fixed (ivory, emerald, gold) so the picture looks the same in light and dark mode.
 */
export function ShareCard({ ar, translation, translationRtl, reference, onDone }: Props) {
  const ref = useRef<View>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Give the fonts and layout a moment before capturing.
    const timer = setTimeout(async () => {
      try {
        const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: 1080 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: reference });
        onDone(true);
      } catch {
        onDone(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [onDone, reference]);

  const size = ar.length > 220 ? 17 : ar.length > 120 ? 20 : 24;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -4000, top: 0, width: SIZE }}>
      <View ref={ref} collapsable={false} style={{ width: SIZE, backgroundColor: '#faf7f0', padding: 14 }}>
        <View style={{ borderWidth: 2, borderColor: '#b8923a', padding: 4 }}>
          <View style={{ borderWidth: 1, borderColor: '#b8923a', paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center', gap: 14 }}>
            <Text className="font-quran" style={{ color: '#b8923a', fontSize: 20, lineHeight: 36, textAlign: 'center', writingDirection: 'rtl' }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
            <Text className="font-quran" style={{ color: '#1d2b26', fontSize: size, lineHeight: size * 2, textAlign: 'center', writingDirection: 'rtl' }}>{ar}</Text>
            {translation ? (
              <>
                <View style={{ width: 28, height: 2, backgroundColor: '#b8923a' }} />
                <Text style={{ color: '#5f6b65', fontSize: 12, lineHeight: 18, textAlign: 'center', writingDirection: translationRtl ? 'rtl' : 'ltr' }}>{translation}</Text>
              </>
            ) : null}
            <Text style={{ color: '#0b5d4b', fontSize: 12, fontWeight: '600', marginTop: 6 }}>{reference}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
