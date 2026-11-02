import { Platform, useWindowDimensions } from 'react-native';

/** On a tablet the app stays a comfortable reading width in the middle of the screen instead of stretching across it. */
export const MAX_CONTENT_WIDTH = 820;
/** Sheets (the bottom panels) never get wider than this. */
export const MAX_SHEET_WIDTH = 680;

/** An iPad, or an Android screen at least 600dp wide on its short side. */
export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();
  if (Platform.OS === 'ios') return Platform.isPad === true;
  return Math.min(width, height) >= 600;
}

/** The width the screens are laid out in (the window, up to MAX_CONTENT_WIDTH). */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH);
}
