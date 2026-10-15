/**
 * Name of the place at a position ("El Mahalla El Kubra"), best effort: used only to label the prayer screen.
 * Uses the free BigDataCloud client-side reverse geocoder (no key). Returns null when offline or unknown.
 */
export async function lookupPlace(lat: number, lng: number, lang: 'ar' | 'en'): Promise<string | null> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${lang}`);
    if (!res.ok) return null;
    const d = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string };
    return d.city || d.locality || d.principalSubdivision || null;
  } catch {
    return null;
  }
}
