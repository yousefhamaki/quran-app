/** Draws an ayah as a shareable PNG card (Arabic text, translation and reference) on a canvas. */

export interface CardInput {
  ar: string;
  translation?: string;
  /** "Al-Mulk · 4" */
  reference: string;
  dark?: boolean;
  /** Direction of the translation. */
  translationDir?: 'ltr' | 'rtl';
}

const W = 1080;
const PAD = 90;

/** Splits text into lines no wider than `max`, measuring with the current canvas font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > max) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderAyahCard({ ar, translation, reference, dark, translationDir = 'ltr' }: CardInput): Promise<Blob> {
  // Make sure the Quran font is ready before measuring.
  try { await document.fonts.load('48px "Scheherazade New"'); await document.fonts.ready; } catch { /* falls back to a system font */ }

  const bg = dark ? '#0f1a17' : '#faf7f0';
  const fg = dark ? '#f2efe6' : '#1d2b26';
  const accent = dark ? '#4fc596' : '#0b5d4b';
  const gold = '#b8923a';
  const muted = dark ? '#a9b4ae' : '#5f6b65';

  const measure = document.createElement('canvas').getContext('2d')!;
  const arSize = ar.length > 220 ? 46 : ar.length > 120 ? 54 : 64;
  const arFont = `${arSize}px "Scheherazade New", "Amiri", serif`;
  const trFont = '34px "Inter", system-ui, sans-serif';
  measure.direction = 'rtl';
  measure.font = arFont;
  const arLines = wrap(measure, ar, W - PAD * 2);
  measure.direction = translationDir;
  measure.font = trFont;
  const trLines = translation ? wrap(measure, translation, W - PAD * 2) : [];

  const arLine = arSize * 1.95;
  const trLine = 50;
  const height = Math.max(
    1080,
    Math.round(PAD + 70 + 40 + arLines.length * arLine + (trLines.length ? 60 + trLines.length * trLine : 0) + 140 + PAD / 2),
  );

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, height);

  // Frame
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, height - 72);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, W - 104, height - 104);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = PAD + 50;

  ctx.fillStyle = gold;
  ctx.font = '40px "Scheherazade New", serif';
  ctx.direction = 'rtl';
  ctx.fillText('﷽', W / 2, y);
  y += 50;

  ctx.fillStyle = fg;
  ctx.font = arFont;
  ctx.direction = 'rtl';
  for (const line of arLines) { y += arLine; ctx.fillText(line, W / 2, y - arSize * 0.35); }

  if (trLines.length) {
    y += 40;
    ctx.fillStyle = gold;
    ctx.fillRect(W / 2 - 40, y, 80, 3);
    y += 30;
    ctx.fillStyle = muted;
    ctx.font = trFont;
    ctx.direction = translationDir;
    for (const line of trLines) { y += trLine; ctx.fillText(line, W / 2, y); }
  }

  y += 70;
  ctx.fillStyle = accent;
  ctx.font = '600 34px "Inter", system-ui, sans-serif';
  ctx.direction = 'ltr';
  ctx.fillText(reference, W / 2, y);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'));
}

/** Shares the card through the system share sheet when the browser can share files, otherwise downloads it. */
export async function shareAyahCard(input: CardInput, filename: string): Promise<'shared' | 'downloaded'> {
  const blob = await renderAyahCard(input);
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: input.reference }); return 'shared'; }
    catch (error) { if ((error as DOMException)?.name === 'AbortError') return 'shared'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
