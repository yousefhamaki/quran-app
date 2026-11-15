import { useMemo } from 'react';
import { useUniwind } from 'uniwind';
import { Text } from '@/components/ui/text';
import { ALLAH_COLOR, splitAllah } from '@/lib/allah';

/**
 * Arabic text with the name of Allah in red. Renders inside the caller's <Text>: a text without the name is returned as
 * it is, otherwise only the name becomes a coloured piece (so the rest of the ayah stays one piece of text).
 */
export function AllahText({ text }: { text: string }) {
  const { theme } = useUniwind();
  const runs = useMemo(() => splitAllah(text), [text]);
  if (runs.length === 1 && !runs[0].allah) return <>{text}</>;
  const color = ALLAH_COLOR[theme === 'dark' ? 'dark' : 'light'];
  return (
    <>
      {runs.map((r, i) =>
        r.allah ? <Text key={i} className="font-quran" style={{ color }}>{r.text}</Text> : r.text,
      )}
    </>
  );
}
