import { useEffect, useState } from 'react';

/**
 * Current weather from Open-Meteo (no account or key). The browser calls it directly, so the
 * chosen place's coordinates leave the network; a server without internet simply shows that the
 * weather could not be loaded.
 */
export interface WeatherSettings {
    place?: { name: string; country?: string; latitude: number; longitude: number };
    unit?: 'c' | 'f';
}

const REFRESH_MS = 15 * 60_000;

interface Current {
    temperature: number;
    code: number;
    wind: number;
    humidity: number;
    isDay: boolean;
    high?: number;
    low?: number;
    /** The next hours, shown when the widget is two columns wide. */
    hours: { time: string; temperature: number; code: number; isDay: boolean }[];
}

// WMO weather interpretation codes, grouped the way people describe the sky.
const describe = (aCode: number): { text: string; icon: 'sun' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm' | 'partly' } => {
    if (aCode === 0) return { text: 'Clear', icon: 'sun' };
    if (aCode <= 2) return { text: 'Partly cloudy', icon: 'partly' };
    if (aCode === 3) return { text: 'Overcast', icon: 'cloud' };
    if (aCode === 45 || aCode === 48) return { text: 'Fog', icon: 'fog' };
    if (aCode >= 51 && aCode <= 67) return { text: aCode >= 61 ? 'Rain' : 'Drizzle', icon: 'rain' };
    if (aCode >= 71 && aCode <= 77) return { text: 'Snow', icon: 'snow' };
    if (aCode >= 80 && aCode <= 82) return { text: 'Showers', icon: 'rain' };
    if (aCode === 85 || aCode === 86) return { text: 'Snow showers', icon: 'snow' };
    if (aCode >= 95) return { text: 'Thunderstorm', icon: 'storm' };
    return { text: 'Unknown', icon: 'cloud' };
};

const WeatherIcon = ({ pIcon, pIsDay }: { pIcon: ReturnType<typeof describe>['icon']; pIsDay: boolean }) => {
    const sun = pIsDay ? <circle cx="16" cy="16" r="7" fill="#f5c142" /> : <path d="M20 9a8 8 0 1 0 5 13 7 7 0 0 1-5-13z" fill="#c4c4c4" />;
    // Clear sky gets the whole tile: a bigger sun with rays (or the moon at night).
    const bigSun = pIsDay ? (
        <g>
            <circle cx="20" cy="20" r="8.5" fill="#f5c142" />
            {Array.from({ length: 8 }, (_, aIndex) => (
                <line key={aIndex} x1="20" y1="4" x2="20" y2="8" stroke="#f5c142" strokeWidth="2" strokeLinecap="round" transform={`rotate(${aIndex * 45} 20 20)`} />
            ))}
        </g>
    ) : (
        <path d="M23 7a13 13 0 1 0 10 19 11 11 0 0 1-10-19z" fill="#d6d6d6" />
    );
    const cloud = (aX = 0, aY = 0, aFill = '#a3a3a3') => <path transform={`translate(${aX} ${aY})`} d="M10 30h20a6 6 0 0 0 0-12 8 8 0 0 0-15-2 6 6 0 0 0-5 14z" fill={aFill} />;
    return (
        <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            {pIcon === 'sun' ? bigSun : null}
            {pIcon === 'partly' ? (
                <>
                    <g transform="translate(-2 -2)">{sun}</g>
                    {cloud(2, 2)}
                </>
            ) : null}
            {pIcon === 'cloud' ? cloud(0, 0) : null}
            {pIcon === 'fog' ? (
                <>
                    {cloud(0, -4)}
                    <path d="M8 32h24M11 36h18" stroke="#818181" strokeWidth="2" strokeLinecap="round" />
                </>
            ) : null}
            {pIcon === 'rain' || pIcon === 'storm' ? (
                <>
                    {cloud(0, -4, '#8a8a8a')}
                    {pIcon === 'rain' ? <path d="M14 30l-2 5M21 30l-2 5M28 30l-2 5" stroke="#4d95f2" strokeWidth="2" strokeLinecap="round" /> : <path d="M21 28l-4 6h4l-3 5" stroke="#f5c142" strokeWidth="2" fill="none" strokeLinejoin="round" />}
                </>
            ) : null}
            {pIcon === 'snow' ? (
                <>
                    {cloud(0, -4)}
                    <path d="M14 32h0M21 35h0M28 32h0" stroke="#f1f1f1" strokeWidth="3" strokeLinecap="round" />
                </>
            ) : null}
        </svg>
    );
};

export const WeatherWidget = ({ pSettings, pActive, pOnConfigure }: { pSettings?: WeatherSettings; pActive: boolean; pOnConfigure: () => void }) => {
    const sPlace = pSettings?.place;
    const sFahrenheit = pSettings?.unit === 'f';
    const [sCurrent, setCurrent] = useState<Current | undefined>(undefined);
    const [sError, setError] = useState<string | undefined>(undefined);

    const sLatitude = sPlace?.latitude;
    const sLongitude = sPlace?.longitude;

    useEffect(() => {
        if (!pActive || sLatitude === undefined || sLongitude === undefined) return;
        const sController = new AbortController();
        const load = async () => {
            try {
                const sUrl =
                    `https://api.open-meteo.com/v1/forecast?latitude=${sLatitude}&longitude=${sLongitude}` +
                    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&hourly=temperature_2m,weather_code,is_day&forecast_hours=7&timezone=auto${sFahrenheit ? '&temperature_unit=fahrenheit' : ''}`;
                const sRes = await fetch(sUrl, { signal: sController.signal });
                if (!sRes.ok) throw new Error(`HTTP ${sRes.status}`);
                const sJson = await sRes.json();
                const sNow = sJson?.current ?? {};
                setCurrent({
                    temperature: sNow.temperature_2m,
                    code: sNow.weather_code,
                    wind: sNow.wind_speed_10m,
                    humidity: sNow.relative_humidity_2m,
                    isDay: sNow.is_day !== 0,
                    high: sJson?.daily?.temperature_2m_max?.[0],
                    low: sJson?.daily?.temperature_2m_min?.[0],
                    // The first hour is the current one; the next six follow.
                    hours: ((sJson?.hourly?.time ?? []) as string[]).slice(1, 7).map((aTime, aIndex) => ({
                        time: aTime.slice(11, 16),
                        temperature: sJson.hourly.temperature_2m[aIndex + 1],
                        code: sJson.hourly.weather_code[aIndex + 1],
                        isDay: sJson.hourly.is_day?.[aIndex + 1] !== 0,
                    })),
                });
                setError(undefined);
            } catch (aError) {
                if ((aError as Error)?.name !== 'AbortError') setError('Weather could not be loaded. The browser may have no internet access.');
            }
        };
        load();
        const sTimer = window.setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS);
        return () => {
            sController.abort();
            window.clearInterval(sTimer);
        };
    }, [pActive, sLatitude, sLongitude, sFahrenheit]);

    if (!sPlace) {
        return (
            <div className="nb-tile nb-weather nb-weather--empty" data-testid="new-board-weather">
                <span>Weather for a place you choose.</span>
                <button type="button" className="nb-link-btn" onClick={pOnConfigure}>
                    Choose a place
                </button>
            </div>
        );
    }
    const sWhat = sCurrent ? describe(sCurrent.code) : undefined;
    const sUnit = sFahrenheit ? '°F' : '°C';
    const deg = (aValue?: number) => (typeof aValue === 'number' ? `${Math.round(aValue)}°` : '–');
    return (
        <div className="nb-tile nb-weather" data-testid="new-board-weather">
            <div className="nb-weather-now">
            <span className="nb-weather-place">
                {sPlace.name}
                {sPlace.country ? <small>{sPlace.country}</small> : null}
            </span>
            <div className="nb-weather-main">
                {sWhat && sCurrent ? <WeatherIcon pIcon={sWhat.icon} pIsDay={sCurrent.isDay} /> : <span className="nb-weather-icon-placeholder" />}
                <span className="nb-weather-temp">
                    {sCurrent ? Math.round(sCurrent.temperature) : sError ? '–' : '…'}
                    <small>{sUnit}</small>
                </span>
            </div>
            <span className="nb-weather-condition">{sError ? sError : sWhat?.text ?? ''}</span>
            {sCurrent && !sError ? (
                <span className="nb-weather-stats">
                    <span title="Today's high and low">
                        <b>{deg(sCurrent.high)}</b> / {deg(sCurrent.low)}
                    </span>
                    <span title="Humidity">
                        <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true">
                            <path d="M4.5 0.5C3 3 1 4.8 1 7a3.5 3.5 0 0 0 7 0c0-2.2-2-4-3.5-6.5z" fill="#4d95f2" />
                        </svg>
                        {Math.round(sCurrent.humidity)}%
                    </span>
                    <span title="Wind">{Math.round(sCurrent.wind)} km/h</span>
                </span>
            ) : null}
            </div>
            {sCurrent && !sError && sCurrent.hours.length ? (
                <ol className="nb-weather-hours" aria-label="Next hours">
                    {sCurrent.hours.map((aHour) => (
                        <li key={aHour.time}>
                            <span className="nb-weather-hour-time">{aHour.time}</span>
                            <WeatherIcon pIcon={describe(aHour.code).icon} pIsDay={aHour.isDay} />
                            <span className="nb-weather-hour-temp">{Math.round(aHour.temperature)}°</span>
                        </li>
                    ))}
                </ol>
            ) : null}
        </div>
    );
};
