/** Open-Meteo's place search: no account or key, called straight from the browser. */
export interface PlaceResult {
    name: string;
    country?: string;
    admin?: string;
    latitude: number;
    longitude: number;
}

export const searchPlaces = async (aQuery: string, aSignal?: AbortSignal): Promise<PlaceResult[]> => {
    const sUrl = `https://geocoding-api.open-meteo.com/v1/search?count=6&format=json&name=${encodeURIComponent(aQuery)}`;
    const sRes = await fetch(sUrl, { signal: aSignal });
    if (!sRes.ok) throw new Error(`Place search failed (${sRes.status})`);
    const sJson = await sRes.json();
    return ((sJson?.results ?? []) as any[]).map((aItem) => ({ name: aItem.name, country: aItem.country, admin: aItem.admin1, latitude: aItem.latitude, longitude: aItem.longitude }));
};
