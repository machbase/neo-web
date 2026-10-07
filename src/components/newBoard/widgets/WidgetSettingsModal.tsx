import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/design-system/components';
import { WidgetNode } from '../layout/layoutModel';
import { CalendarSettings, ClockSettings } from './TimeWidgets';
import { isValidTimeZone } from './timeZone';
import { WeatherSettings } from './WeatherWidget';
import { PlaceResult, searchPlaces } from './weatherApi';

const zoneList = (): string[] => {
    try {
        return (Intl as any).supportedValuesOf?.('timeZone') ?? [];
    } catch {
        return [];
    }
};

interface Props {
    pNode: WidgetNode;
    pOnSave: (aSettings: Record<string, unknown>) => void;
    pOnClose: () => void;
}

/** Options for the widgets that have any: clock, weather and calendar. */
export const WidgetSettingsModal = ({ pNode, pOnSave, pOnClose }: Props) => {
    const [sSettings, setSettings] = useState<Record<string, any>>(pNode.settings ?? {});
    const set = (aPatch: Record<string, unknown>) => setSettings((aPrev) => ({ ...aPrev, ...aPatch }));
    const sZones = useMemo(zoneList, []);

    // Weather place search, debounced.
    const [sQuery, setQuery] = useState('');
    const [sPlaces, setPlaces] = useState<PlaceResult[]>([]);
    const [sSearchError, setSearchError] = useState<string | undefined>(undefined);
    useEffect(() => {
        if (pNode.type !== 'weather' || sQuery.trim().length < 2) {
            setPlaces([]);
            return;
        }
        const sController = new AbortController();
        const sTimer = window.setTimeout(() => {
            searchPlaces(sQuery.trim(), sController.signal)
                .then((aPlaces) => {
                    setPlaces(aPlaces);
                    setSearchError(aPlaces.length ? undefined : 'No place by that name.');
                })
                .catch((aError) => {
                    if (aError?.name !== 'AbortError') setSearchError('Place search needs internet access from this browser.');
                });
        }, 300);
        return () => {
            sController.abort();
            window.clearTimeout(sTimer);
        };
    }, [sQuery, pNode.type]);

    const sZoneInvalid = pNode.type === 'clock' && !!sSettings.timeZone && !isValidTimeZone(sSettings.timeZone);
    const sTitle = pNode.type === 'clock' ? 'Clock' : pNode.type === 'weather' ? 'Weather' : 'Calendar';

    return (
        <Modal.Root isOpen onClose={pOnClose} className="nb-modal" data-testid="new-board-widget-settings" style={{ width: '440px', maxWidth: '92vw', height: 'auto', maxHeight: '86vh' }}>
            <Modal.Header>
                <Modal.Title>{sTitle} settings</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <div className="nb-form">
                        {pNode.type === 'clock' ? (
                            <>
                                <div className="nb-field" role="radiogroup" aria-label="Style">
                                    <span>Style</span>
                                    <div className="nb-seg">
                                        {(['analog', 'digital'] as const).map((aStyle) => (
                                            <button type="button" key={aStyle} role="radio" aria-checked={((sSettings as ClockSettings).style ?? 'analog') === aStyle} onClick={() => set({ style: aStyle })}>
                                                {aStyle === 'analog' ? 'Analog' : 'Digital'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <label className="nb-field">
                                    <span>Time zone</span>
                                    <input
                                        className="nb-input"
                                        list="nb-time-zones"
                                        value={sSettings.timeZone ?? ''}
                                        placeholder="This browser's time zone"
                                        aria-invalid={sZoneInvalid}
                                        onChange={(aEvent) => set({ timeZone: aEvent.target.value })}
                                    />
                                    <datalist id="nb-time-zones">
                                        {sZones.map((aZone) => (
                                            <option key={aZone} value={aZone} />
                                        ))}
                                    </datalist>
                                    {sZoneInvalid ? <small className="nb-error-text">Not a time zone. Pick one from the list, e.g. Europe/Berlin.</small> : null}
                                </label>
                                <label className="nb-field">
                                    <span>Label</span>
                                    <input className="nb-input" maxLength={30} value={sSettings.label ?? ''} placeholder="Shown under the clock, e.g. Plant B" onChange={(aEvent) => set({ label: aEvent.target.value })} />
                                </label>
                                <label className="nb-check">
                                    <input type="checkbox" checked={!!sSettings.hour12} onChange={(aEvent) => set({ hour12: aEvent.target.checked })} />
                                    12-hour time (digital)
                                </label>
                            </>
                        ) : null}

                        {pNode.type === 'weather' ? (
                            <>
                                <div className="nb-field">
                                    <span>Place</span>
                                    {(sSettings as WeatherSettings).place ? (
                                        <span className="nb-chosen">
                                            {(sSettings as WeatherSettings).place!.name}
                                            {(sSettings as WeatherSettings).place!.country ? `, ${(sSettings as WeatherSettings).place!.country}` : ''}
                                        </span>
                                    ) : null}
                                    <input className="nb-input" type="search" value={sQuery} placeholder="Search a city" onChange={(aEvent) => setQuery(aEvent.target.value)} aria-label="Search a city" />
                                    {sPlaces.length ? (
                                        <div className="nb-list">
                                            {sPlaces.map((aPlace, aIndex) => (
                                                <button
                                                    type="button"
                                                    key={aIndex}
                                                    className="nb-list-row nb-list-pick"
                                                    onClick={() => {
                                                        set({ place: { name: aPlace.name, country: aPlace.country, latitude: aPlace.latitude, longitude: aPlace.longitude } });
                                                        setQuery('');
                                                        setPlaces([]);
                                                    }}
                                                >
                                                    <span className="nb-list-name">
                                                        {aPlace.name}
                                                        <small>{[aPlace.admin, aPlace.country].filter(Boolean).join(', ')}</small>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                    {sSearchError ? <small className="nb-muted">{sSearchError}</small> : null}
                                </div>
                                <div className="nb-field" role="radiogroup" aria-label="Unit">
                                    <span>Unit</span>
                                    <div className="nb-seg">
                                        {(['c', 'f'] as const).map((aUnit) => (
                                            <button type="button" key={aUnit} role="radio" aria-checked={(sSettings.unit ?? 'c') === aUnit} onClick={() => set({ unit: aUnit })}>
                                                °{aUnit.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <small className="nb-muted">Weather comes from Open-Meteo. This browser sends it the place's coordinates.</small>
                            </>
                        ) : null}

                        {pNode.type === 'calendar' ? (
                            <div className="nb-field" role="radiogroup" aria-label="Week starts on">
                                <span>Week starts on</span>
                                <div className="nb-seg">
                                    {(['sun', 'mon'] as const).map((aDay) => (
                                        <button type="button" key={aDay} role="radio" aria-checked={((sSettings as CalendarSettings).weekStart ?? 'sun') === aDay} onClick={() => set({ weekStart: aDay })}>
                                            {aDay === 'sun' ? 'Sunday' : 'Monday'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </Modal.Content>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel onClick={pOnClose} />
                <Modal.Confirm
                    data-testid="new-board-widget-settings-save"
                    disabled={sZoneInvalid}
                    onClick={() => {
                        pOnSave(sSettings);
                        pOnClose();
                    }}
                >
                    Save
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
};
