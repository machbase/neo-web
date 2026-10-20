import { useEffect, useMemo, useRef, useState } from 'react';
import { Combobox, ComboboxOption, Modal } from '@/design-system/components';
import { VscChevronDown } from 'react-icons/vsc';
import { WidgetNode } from '../layout/layoutModel';
import { CalendarSettings, ClockSettings } from './TimeWidgets';
import { isValidTimeZone } from './timeZone';
import { WeatherSettings } from './WeatherWidget';
import { PlaceResult, searchPlaces } from './weatherApi';
import { useDialogFocus } from '../useDialogFocus';

/** The browser's zones, with UTC first: Chromium's list leaves out UTC (and every Etc/ zone). */
const zoneList = (): string[] => {
    let sZones: string[] = [];
    try {
        sZones = (Intl as any).supportedValuesOf?.('timeZone') ?? [];
    } catch {
        // No list: only UTC and the browser's own zone to choose from.
    }
    return ['UTC', ...sZones.filter((aZone) => aZone !== 'UTC')];
};

/** The Combobox needs a value for "no zone set"; it stands for the browser's own time zone. */
const BROWSER_ZONE = '__browser__';

interface Props {
    pNode: WidgetNode;
    pOnSave: (aSettings: Record<string, unknown>) => void;
    pOnClose: () => void;
}

/** Options for the widgets that have any: clock, weather and calendar. */
export const WidgetSettingsModal = ({ pNode, pOnSave, pOnClose }: Props) => {
    const [sSettings, setSettings] = useState<Record<string, any>>(pNode.settings ?? {});
    const sListOpenOnEscape = useRef(false);
    useDialogFocus('new-board-widget-settings');
    const set = (aPatch: Record<string, unknown>) => setSettings((aPrev) => ({ ...aPrev, ...aPatch }));
    const sZones = useMemo(zoneList, []);
    const sZoneOptions = useMemo<ComboboxOption[]>(() => {
        const sSaved = sSettings.timeZone as string | undefined;
        // A saved zone the list leaves out (an alias such as Asia/Calcutta) still shows as chosen.
        const sAll = sSaved && !sZones.includes(sSaved) ? [sSaved, ...sZones] : sZones;
        return [
            { value: BROWSER_ZONE, label: "This browser's time zone", testId: 'zone-browser' },
            ...sAll.map((aZone) => ({ value: aZone, label: aZone, testId: `zone-${encodeURIComponent(aZone)}` })),
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sZones]);

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
                                            <button type="button" key={aStyle} data-testid={`style-${aStyle}`} role="radio" aria-checked={((sSettings as ClockSettings).style ?? 'analog') === aStyle} onClick={() => set({ style: aStyle })}>
                                                {aStyle === 'analog' ? 'Analog' : 'Digital'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div
                                    className="nb-field"
                                    data-testid="time-zone"
                                    // Escape with the zone list open closes the list only; the dialog listens on the
                                    // document, so the key stops here. Read before the list handles it and closes.
                                    onKeyDownCapture={(aEvent) => {
                                        sListOpenOnEscape.current = aEvent.key === 'Escape' && (aEvent.target as HTMLElement).getAttribute('aria-expanded') === 'true';
                                    }}
                                    onKeyDown={(aEvent) => {
                                        if (sListOpenOnEscape.current) aEvent.stopPropagation();
                                    }}
                                >
                                    <span>Time zone</span>
                                    {/* The app's own combobox, as the worksheet's time zone uses, instead of the browser's datalist. */}
                                    <Combobox.Root
                                        fullWidth
                                        options={sZoneOptions}
                                        value={sSettings.timeZone || BROWSER_ZONE}
                                        onChange={(aValue) => set({ timeZone: aValue === BROWSER_ZONE ? undefined : aValue })}
                                        // The list clears the field while it is open; the chosen zone stays readable in it.
                                        placeholder={sSettings.timeZone || "This browser's time zone"}
                                    >
                                        <Combobox.Input data-testid="time-zone-input" />
                                        <Combobox.Trigger icon={<VscChevronDown size={14} />} />
                                        <Combobox.Dropdown>
                                            <Combobox.List />
                                        </Combobox.Dropdown>
                                    </Combobox.Root>
                                    {sZoneInvalid ? <small className="nb-error-text">Not a time zone. Pick one from the list, e.g. Europe/Berlin.</small> : null}
                                </div>
                                <label className="nb-field">
                                    <span>Label</span>
                                    <input className="nb-input" data-testid="label" maxLength={30} value={sSettings.label ?? ''} placeholder="Shown under the clock, e.g. Plant B" onChange={(aEvent) => set({ label: aEvent.target.value })} />
                                </label>
                                <label className="nb-check">
                                    <input type="checkbox" data-testid="hour12" checked={!!sSettings.hour12} onChange={(aEvent) => set({ hour12: aEvent.target.checked })} />
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
