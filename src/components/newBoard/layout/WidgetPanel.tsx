import { useEffect, useMemo, useState } from 'react';
import icons from '@/utils/icons';
import { Close, Search } from '@/assets/icons/Icon';
import { Group } from '../groups/groupModel';
import { GroupGlyph } from '../groups/GroupWidget';
import { GroupItemIcon } from '../groups/GroupItemIcon';
import { GroupItemKind } from '../groups/groupModel';
import { KIND_LABELS, listResources, ResourceEntry } from '../groups/groupResources';
import { BUILTIN_WIDGETS, BuiltinWidgetType, createSection, createWidget, LayoutNode, placedWidgetKeys, SectionNode, widgetKey } from './layoutModel';
import { setLayoutDrag } from './layoutDrag';

interface PanelEntry {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    /** Unique widgets already on the page cannot be added again. */
    placed: boolean;
    /** Why this account cannot use it, if it cannot. */
    unavailable?: string;
    create: () => LayoutNode;
}

const SectionIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.5" y="3" width="13" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2" />
        <path d="M4 6h5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
);
const ClockIcon = ({ pDigital }: { pDigital?: boolean }) =>
    pDigital ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="4" width="13" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <text x="8" y="10.6" textAnchor="middle" fontSize="5.5" fill="currentColor" fontFamily="monospace">
                12:30
            </text>
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
    );
const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="3" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 6.5h12M5 1.8v2.4M11 1.8v2.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
);
// Weather is off for now (it needs internet access to Open-Meteo); restore this and its panel entry to bring it back.
// const WeatherIcon = () => (
//     <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
//         <circle cx="6" cy="6" r="3" fill="#f5c142" />
//         <path d="M5 13h7a2.5 2.5 0 0 0 0-5 3.5 3.5 0 0 0-6.5-1A2.6 2.6 0 0 0 5 13z" fill="#a3a3a3" />
//     </svg>
// );
const BUILTIN_ICON: Record<'pulse' | 'create' | 'shells' | 'examples' | 'recent' | 'references' | 'sdk', React.ReactNode> = {
    pulse: (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1 9h3l2-5 3 8 2-4h4" fill="none" stroke="#6d8bff" strokeWidth="1.5" />
        </svg>
    ),
    create: icons('dsh'),
    shells: icons('term', true),
    examples: (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3l8 5-8 5z" fill="#4d95f2" />
        </svg>
    ),
    references: icons('url'),
    sdk: icons('url'),
    recent: (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
    ),
};

interface WidgetPanelProps {
    pNodes: SectionNode[];
    pGroups: Group[];
    pTargetLabel?: string;
    pOnAdd: (aCreate: () => LayoutNode) => void;
    pOnNewGroup: () => void;
    pOnClose: () => void;
    /** Why this account cannot use a built-in widget, if it cannot. */
    pUnavailable?: (aType: BuiltinWidgetType) => string | undefined;
}

/** Things on the server that can be placed one at a time as a shortcut widget. Files and folders go into groups. */
// Tables are left out: there are hundreds on a busy server; they still go into groups.
const RESOURCE_KINDS: Exclude<GroupItemKind, 'file' | 'folder'>[] = ['package', 'timer', 'bridge', 'shell', 'token', 'cert'];
type ResourceKind = (typeof RESOURCE_KINDS)[number];
type ResourceList = { status: 'loading' } | { status: 'ready'; entries: ResourceEntry[] } | { status: 'error'; reason: string };

export const WidgetPanel = ({ pNodes, pGroups, pTargetLabel, pOnAdd, pOnNewGroup, pOnClose, pUnavailable }: WidgetPanelProps) => {
    const [sQuery, setQuery] = useState('');
    const sPlaced = useMemo(() => placedWidgetKeys(pNodes), [pNodes]);
    const [sOpenKinds, setOpenKinds] = useState<Set<ResourceKind>>(new Set());
    // Groups and Built-in start open; a search opens everything it matched.
    const [sClosed, setClosed] = useState<Set<'groups' | 'builtin'>>(new Set());
    const isOpen = (aId: 'groups' | 'builtin') => sQuery.trim() !== '' || !sClosed.has(aId);
    const sectionToggle = (aId: 'groups' | 'builtin', aLabel: string, aCount: number) => (
        <button
            type="button"
            className="nb-panel-cat nb-panel-cat--toggle"
            aria-expanded={isOpen(aId)}
            data-testid={`new-board-panel-toggle-${aId}`}
            onClick={() =>
                setClosed((aPrev) => {
                    const sNext = new Set(aPrev);
                    if (sNext.has(aId)) sNext.delete(aId);
                    else sNext.add(aId);
                    return sNext;
                })
            }
        >
            <span>
                <span className="nb-chevron" aria-hidden="true">
                    {isOpen(aId) ? '▾' : '▸'}
                </span>
                {aLabel}
            </span>
            <span className="nb-panel-count">{aCount}</span>
        </button>
    );
    const [sLists, setLists] = useState<Partial<Record<ResourceKind, ResourceList>>>({});
    const sTermActive = sQuery.trim() !== '';

    // A list loads the first time its heading is opened, or for every kind once a search starts.
    useEffect(() => {
        const sWanted = RESOURCE_KINDS.filter((aKind) => (sTermActive || sOpenKinds.has(aKind)) && !sLists[aKind]);
        if (!sWanted.length) return;
        setLists((aPrev) => ({ ...aPrev, ...Object.fromEntries(sWanted.map((aKind) => [aKind, { status: 'loading' }])) }));
        sWanted.forEach((aKind) =>
            listResources(aKind)
                .then((aEntries) => setLists((aPrev) => ({ ...aPrev, [aKind]: { status: 'ready', entries: aEntries } })))
                .catch((aError) => setLists((aPrev) => ({ ...aPrev, [aKind]: { status: 'error', reason: aError instanceof Error ? aError.message : 'Could not load the list.' } })))
        );
    }, [sTermActive, sOpenKinds, sLists]);

    const sBuiltins: PanelEntry[] = (['pulse', 'create', 'shells', 'examples', 'recent', 'references', 'sdk'] as BuiltinWidgetType[]).map((aType) => ({
        id: aType,
        title: BUILTIN_WIDGETS[aType].title,
        description: BUILTIN_WIDGETS[aType].description,
        icon: BUILTIN_ICON[aType as keyof typeof BUILTIN_ICON],
        placed: sPlaced.has(aType),
        unavailable: pUnavailable?.(aType),
        create: () => createWidget(aType),
    }));
    const sTime: PanelEntry[] = [
        { id: 'clock-analog', title: 'Analog clock', description: 'Any time zone', icon: <ClockIcon />, placed: false, create: () => createWidget('clock', 1, undefined, { style: 'analog' }) },
        { id: 'clock-digital', title: 'Digital clock', description: 'Any time zone, 12 or 24 hours', icon: <ClockIcon pDigital />, placed: false, create: () => createWidget('clock', 1, undefined, { style: 'digital' }) },
        { id: 'calendar', title: BUILTIN_WIDGETS.calendar.title, description: BUILTIN_WIDGETS.calendar.description, icon: <CalendarIcon />, placed: false, create: () => createWidget('calendar', 1) },
        // { id: 'weather', title: BUILTIN_WIDGETS.weather.title, description: BUILTIN_WIDGETS.weather.description, icon: <WeatherIcon />, placed: false, create: () => createWidget('weather', 1) },
    ];
    const sGroupEntries: PanelEntry[] = pGroups.map((aGroup) => ({
        id: `group:${aGroup.id}`,
        title: aGroup.name,
        description: `${aGroup.items.length} item${aGroup.items.length === 1 ? '' : 's'} · ${aGroup.visibility === 'shared' ? 'Shared' : 'Only me'}`,
        icon: (
            <span style={{ color: aGroup.color, display: 'inline-flex' }}>
                <GroupGlyph />
            </span>
        ),
        placed: sPlaced.has(widgetKey({ type: 'group', groupId: aGroup.id })),
        create: () => createWidget('group', 2, aGroup.id),
    }));

    const sTerm = sQuery.trim().toLowerCase();
    const filter = (aList: PanelEntry[]) => aList.filter((aEntry) => !sTerm || `${aEntry.title} ${aEntry.description}`.toLowerCase().includes(sTerm));

    const entry = (aEntry: PanelEntry, aExtraClass = '') => (
        <div
            key={aEntry.id}
            className={`nb-panel-item${aEntry.placed || aEntry.unavailable ? ' is-placed' : ''}${aExtraClass}`}
            data-testid={`new-board-panel-${aEntry.id}`}
            title={aEntry.unavailable}
            draggable={!aEntry.placed && !aEntry.unavailable}
            onDragStart={(aEvent) => {
                setLayoutDrag({ from: 'panel', create: aEntry.create });
                aEvent.dataTransfer.effectAllowed = 'copy';
                aEvent.dataTransfer.setData('text/plain', aEntry.id);
            }}
            onDragEnd={() => setLayoutDrag(undefined)}
        >
            <span className="nb-panel-icon">{aEntry.icon}</span>
            <span className="nb-panel-text">
                <b>{aEntry.title}</b>
                <small>{aEntry.description}</small>
            </span>
            {aEntry.unavailable ? (
                <span className="nb-panel-placed">No access</span>
            ) : aEntry.placed ? (
                <span className="nb-panel-placed">On page</span>
            ) : (
                <button type="button" className="nb-icon-btn nb-panel-add" aria-label={`Add ${aEntry.title}`} title={pTargetLabel ? `Add to ${pTargetLabel}` : 'Add as a new section at the bottom'} onClick={() => pOnAdd(aEntry.create)}>
                    +
                </button>
            )}
        </div>
    );

    const sGroupsShown = filter(sGroupEntries);

    const resourceEntry = (aEntry: ResourceEntry): PanelEntry => ({
        id: `item:${aEntry.kind}:${aEntry.ref}`,
        title: aEntry.label,
        description: aEntry.detail || KIND_LABELS[aEntry.kind].one,
        icon: <GroupItemIcon pKind={aEntry.kind} pRef={aEntry.ref} />,
        placed: sPlaced.has(`item:${aEntry.kind}:${aEntry.ref}`),
        create: () => createWidget('item', 1, undefined, { kind: aEntry.kind, ref: aEntry.ref, label: aEntry.label }),
    });

    const resourceGroup = (aKind: ResourceKind) => {
        const sList = sLists[aKind];
        const sOpen = sTermActive || sOpenKinds.has(aKind);
        const sEntries = sList?.status === 'ready' ? filter(sList.entries.map(resourceEntry)) : [];
        // While searching, a kind with no match is left out entirely.
        if (sTermActive && sList?.status === 'ready' && !sEntries.length) return null;
        return (
            <div className="nb-panel-group" key={aKind}>
                <button
                    type="button"
                    className="nb-panel-cat nb-panel-cat--toggle"
                    aria-expanded={sOpen}
                    data-testid={`new-board-panel-kind-${aKind}`}
                    onClick={() =>
                        setOpenKinds((aPrev) => {
                            const sNext = new Set(aPrev);
                            if (sNext.has(aKind)) sNext.delete(aKind);
                            else sNext.add(aKind);
                            return sNext;
                        })
                    }
                >
                    <span>
                        <span className="nb-chevron" aria-hidden="true">
                            {sOpen ? '▾' : '▸'}
                        </span>
                        {KIND_LABELS[aKind].many}
                    </span>
                    {sList?.status === 'ready' ? <span className="nb-panel-count">{sList.entries.length}</span> : null}
                </button>
                {sOpen ? (
                    <>
                        {sList?.status === 'loading' || !sList ? <p className="nb-empty">Loading…</p> : null}
                        {sList?.status === 'error' ? <p className="nb-empty">{sList.reason}</p> : null}
                        {sList?.status === 'ready' && !sList.entries.length ? <p className="nb-empty">No {KIND_LABELS[aKind].many.toLowerCase()} on this server.</p> : null}
                        {sEntries.map((aEntry) => entry(aEntry))}
                    </>
                ) : null}
            </div>
        );
    };
    return (
        <aside className="nb-panel" aria-label="Widgets" data-testid="new-board-widget-panel">
            <div className="nb-panel-head">
                <h3>Widgets</h3>
                <button type="button" className="nb-icon-btn" aria-label="Close widgets" onClick={pOnClose}>
                    ✕
                </button>
            </div>
            <p className="nb-panel-target">
                {pTargetLabel ? (
                    <>
                        + adds to <b>{pTargetLabel}</b>. Click outside the sections to add at the bottom instead.
                    </>
                ) : (
                    'Select a section to add into it. Otherwise + adds a new section at the bottom. You can also drag.'
                )}
            </p>
            {/* Same field as the DB explorer's "Search tables", so the two panels look alike. */}
            <div className={`nb-panel-search${sQuery ? ' is-active' : ''}`}>
                <span className="nb-panel-search-icon" aria-hidden="true">
                    <Search size={12} />
                </span>
                <input
                    className="nb-panel-search-input"
                    type="text"
                    value={sQuery}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="Search widgets"
                    aria-label="Search widgets"
                    onChange={(aEvent) => setQuery(aEvent.target.value)}
                    onKeyDown={(aEvent) => {
                        if (aEvent.key === 'Escape' && sQuery) {
                            aEvent.stopPropagation();
                            setQuery('');
                        }
                    }}
                />
                {sQuery ? (
                    <button type="button" className="nb-panel-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
                        <Close size={12} />
                    </button>
                ) : null}
            </div>
            <div className="nb-panel-body">
                {!sTerm || 'section'.includes(sTerm) ? (
                    <div className="nb-panel-group">
                        <div className="nb-panel-cat">Layout</div>
                        {entry({ id: 'section', title: 'Section', description: 'A row with a title. Put widgets or other sections inside.', icon: <SectionIcon />, placed: false, create: () => createSection() }, ' is-section')}
                    </div>
                ) : null}
                <div className="nb-panel-group">
                    <div className="nb-panel-cat-row">
                        {sectionToggle('groups', 'Groups', pGroups.length)}
                        <button type="button" className="nb-link-btn" data-testid="new-board-new-group" onClick={pOnNewGroup}>
                            + New group
                        </button>
                    </div>
                    {isOpen('groups') ? (
                        <>
                            {sGroupsShown.map((aEntry) => entry(aEntry))}
                            {!pGroups.length ? <p className="nb-empty">No groups yet. A group collects shortcuts to files, folders, packages, timers and more.</p> : null}
                        </>
                    ) : null}
                </div>
                {filter([...sBuiltins, ...sTime]).length ? (
                    <div className="nb-panel-group">
                        {sectionToggle('builtin', 'Built-in', sBuiltins.length + sTime.length)}
                        {isOpen('builtin') ? filter([...sBuiltins, ...sTime]).map((aEntry) => entry(aEntry)) : null}
                    </div>
                ) : null}
                {RESOURCE_KINDS.map(resourceGroup)}
            </div>
        </aside>
    );
};
