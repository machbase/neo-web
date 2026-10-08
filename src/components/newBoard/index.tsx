import './index.scss';
import { useRecoilState, useRecoilValue } from 'recoil';
import moment from 'moment';
import { gBoardList, gSelectedTab, gShellList } from '@/recoil/recoil';
import icons from '@/utils/icons';
import { extractionExtension } from '@/utils';
import { useMemo, useRef, useState } from 'react';
import { Button, Page, Toast } from '@/design-system/components';
import { TAZ_FORMAT_VERSION } from '@/components/tagAnalyzer/persistence/tazFormat';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';
import { OPENABLE_EXTENSIONS, OPEN_FILE_ACCEPT, parseOpenedFile } from './openFileContent';
import { RecentFile, recordRecentFile, removeRecentFile, useRecentFiles } from '@/utils/recentFiles';
import { BoardPreview } from './BoardPreview';
import { ServerPulse } from './ServerPulse';
import { ShellCards } from './ShellCards';
import { useOpenShellCreate } from '@/components/side/Shell/useOpenShellCreate';
import { loadNeoStatzDashboard, NEO_STATZ_DASHBOARD, STARTER_TEMPLATES, StarterTemplate } from './starterTemplates';
import { LayoutBoard } from './layout/LayoutBoard';
import { WidgetPanel } from './layout/WidgetPanel';
import { useNewTabLayout } from './layout/useNewTabLayout';
import {
    BUILTIN_WIDGETS,
    createDefaultLayout,
    createWidget,
    findNode,
    hideUnavailable,
    insertNode,
    isItemSettings,
    LayoutNode,
    removeGroupWidgets,
    removeNode,
    SectionNode,
    updateNode,
    WidgetNode,
    WidgetSize,
} from './layout/layoutModel';
import { useNewTabGroups } from './groups/useNewTabGroups';
import { Group, GROUP_COLORS, GroupItem, itemKey } from './groups/groupModel';
import { GroupWidget } from './groups/GroupWidget';
import { ItemWidget } from './groups/ItemWidget';
import { GroupEditModal } from './groups/GroupEditModal';
import { GroupItemPicker } from './groups/GroupItemPicker';
import { CalendarSettings, CalendarWidget, ClockSettings, ClockWidget } from './widgets/TimeWidgets';
import { ReferencesWidget } from './widgets/ReferencesWidget';
import { isWidgetAvailable, UNAVAILABLE_REASON, useStatzAccess } from './widgetAccess';
// Weather is off for now; see WidgetPanel.
// import { WeatherSettings, WeatherWidget } from './widgets/WeatherWidget';
import { WidgetSettingsModal } from './widgets/WidgetSettingsModal';

interface NewBoardProps {
    pExtentionList: any;
    setIsOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
    pGetInfo: any;
    pIsActiveTab?: boolean;
}

/** Card copy per tab type. Types the server adds later still get a card, from its own label. */
const CARD_INFO: Record<string, { title: string; description: string }> = {
    dsh: { title: 'Dashboard', description: 'Put several live charts on one screen and share it.' },
    sql: { title: 'SQL', description: 'Query tables and see the result as a grid.' },
    tql: { title: 'TQL', description: 'Transform data step by step and output charts, CSV or JSON.' },
    taz: { title: 'Tag Analyzer', description: 'Compare tag time series and zoom into any range.' },
    wrk: { title: 'Worksheet', description: 'Mix notes, SQL and TQL cells like a notebook.' },
};
const CARD_ORDER = ['dsh', 'sql', 'tql', 'taz', 'wrk'];


const TERM_ICONS = ['console-network-outline', 'console-network', 'database-outline', 'database', 'console-line', 'powershell', 'monitor', 'monitor-small', 'laptop', 'fish', 'console'];

const NewBoard = (props: NewBoardProps) => {
    const { pExtentionList, pGetInfo, pIsActiveTab = true } = props;
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sIsDragging, setIsDragging] = useState(false);
    const [sHoveredCard, setHoveredCard] = useState<string | undefined>(undefined);
    const sDragDepth = useRef(0);
    const [sIsLoadingStatz, setIsLoadingStatz] = useState(false);
    const sFileInput = useRef<HTMLInputElement>(null);
    const sShellList = useRecoilValue<any>(gShellList);
    const sRecentFiles = useRecentFiles();
    const openShellCreate = useOpenShellCreate();

    /** Turn this New tab into something else, keeping its id. */
    const replaceCurrentTab = (aFields: Record<string, any>) => {
        setBoardList(sBoardList.map((aItem: any) => (aItem.id === sSelectedTab ? { ...aItem, ...aFields, id: aItem.id } : aItem)));
    };

    const readFile = async (aItem: any) => {
        return (await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e: any) => {
                resolve(e.target.result);
            };
            reader.onerror = () => reject(reader.error ?? new Error('Failed to read the file.'));
            reader.readAsText(aItem);
        })) as string;
    };

    const handleChange = async (aFile: File | undefined) => {
        if (!aFile) return;
        const extension = extractionExtension(aFile.name);
        if (!OPENABLE_EXTENSIONS.includes(extension)) {
            Toast.error(`Cannot open .${extension} files here. Use ${OPENABLE_EXTENSIONS.map((aExt) => '.' + aExt).join(' ')}.`);
            return;
        }
        let sText: string;
        try {
            sText = await readFile(aFile);
        } catch (aError) {
            Toast.error(aError instanceof Error ? aError.message : 'Failed to read the file.', { testId: 'new-board-open-file-error-toast' });
            return;
        }
        uploadFile(aFile, sText);
    };

    const uploadFile = (aFileInfo: File, aFileValue: string) => {
        const sTypeOption = extractionExtension(aFileInfo.name);
        const sOpened = parseOpenedFile(sTypeOption, aFileValue, aFileInfo.name, sSelectedTab);
        if (!sOpened.ok) {
            Toast.error(sOpened.error, { testId: 'new-board-open-file-error-toast' });
            return;
        }
        if (sOpened.mode === 'replace') {
            // dsh/taz: replace the whole tab object so the previous tab's code/sheet do not linger
            setBoardList(sBoardList.map((aItem: any) => (aItem.id === sSelectedTab ? { ...sOpened.board, id: aItem.id } : aItem)));
        } else {
            replaceCurrentTab(sOpened.fields);
        }
    };

    const setIcon = (aType: any) => {
        switch (aType.type) {
            case 'sql':
            case 'tql':
            case 'wrk':
            case 'taz':
            case 'dsh':
                return icons(aType.type, true);
            case 'term':
                return icons(TERM_ICONS.includes(aType.icon) ? aType.icon : 'term', true);
            default:
                return icons('none', true);
        }
    };

    const changeTabOption = (aEvent: React.SyntheticEvent, aValue: any) => {
        aEvent.preventDefault();
        replaceCurrentTab({
            type: aValue.type,
            name: aValue.label,
            panels: [],
            sheet: [],
            savedCode: false,
            ...(aValue.type === 'taz' ? { version: TAZ_FORMAT_VERSION, boardTimeRange: { start: '', end: '' }, boardNumericRange: { start: '', end: '' } } : {}),
            shell: { icon: aValue.icon, theme: aValue.theme ? aValue.theme : '', id: aValue.id ? aValue.id : 'SHELL' },
            dashboard: {
                variables: [],
                timeRange: {
                    start: 'now-1h',
                    end: 'now',
                    refresh: 'Off',
                },
                distanceRange: {
                    start: '',
                    end: '',
                },
                title: 'New dashboard',
                panels: [],
            },
        });
    };

    const openNeoStatzDashboard = async () => {
        // The References list may already have it open; go there rather than open a second copy.
        const sOpenTab = sBoardList.find((aBoard: any) => aBoard._CHEAT_SHEET && aBoard.name === NEO_STATZ_DASHBOARD.title);
        if (sOpenTab) {
            setSelectedTab(sOpenTab.id);
            return;
        }
        if (sIsLoadingStatz) return;
        setIsLoadingStatz(true);
        try {
            const sBoard = await loadNeoStatzDashboard();
            setBoardList((aPrev: any[]) => aPrev.map((aItem: any) => (aItem.id === sSelectedTab ? { ...sBoard, id: aItem.id } : aItem)));
        } catch (aError) {
            Toast.error(`Could not open the neo_statz dashboard: ${aError instanceof Error ? aError.message : String(aError)}`);
        } finally {
            setIsLoadingStatz(false);
        }
    };

    const openTemplate = (aTemplate: StarterTemplate) => (aTemplate.build ? replaceCurrentTab(aTemplate.build()) : openNeoStatzDashboard());

    const openRecent = async (aFile: RecentFile) => {
        const sOpenTab = sBoardList.find((aBoard: any) => aBoard.name === aFile.name && aBoard.path === aFile.path);
        if (sOpenTab) {
            recordRecentFile(aFile);
            setSelectedTab(sOpenTab.id);
            return;
        }
        const sLoaded = await loadBoardFromFile(aFile, sSelectedTab);
        if (sLoaded.error !== undefined) {
            if (sLoaded.invalid) {
                // the file is there but damaged: keep it in Recent so the user can fix and retry
                Toast.error(`${aFile.path}${aFile.name} is damaged and cannot be opened: ${sLoaded.error}`, { testId: 'new-board-open-file-error-toast' });
                return;
            }
            Toast.error(`Could not open ${aFile.path}${aFile.name}: ${sLoaded.error}. It was removed from Recent.`);
            removeRecentFile(aFile);
            return;
        }
        pGetInfo?.();
        recordRecentFile(aFile);
        setBoardList(sBoardList.map((aItem: any) => (aItem.id === sSelectedTab ? sLoaded.board : aItem)));
    };

    const { sCreateItems, sShellItems } = useMemo(() => {
        const sCreate = (pExtentionList ?? []).filter((aItem: any) => aItem.type !== 'term');
        sCreate.sort((aItem: any, bItem: any) => {
            const sA = CARD_ORDER.indexOf(aItem.type);
            const sB = CARD_ORDER.indexOf(bItem.type);
            return (sA === -1 ? CARD_ORDER.length : sA) - (sB === -1 ? CARD_ORDER.length : sB);
        });
        return { sCreateItems: sCreate, sShellItems: sShellList ?? [] };
    }, [pExtentionList, sShellList]);

    // Drag events fire on every child the pointer crosses, so count enters and leaves.
    const handleDragEnter = (aEvent: React.DragEvent) => {
        if (!Array.from(aEvent.dataTransfer?.types ?? []).includes('Files')) return;
        aEvent.preventDefault();
        sDragDepth.current += 1;
        setIsDragging(true);
    };
    const handleDragOver = (aEvent: React.DragEvent) => {
        if (!sIsDragging) return;
        aEvent.preventDefault();
        aEvent.stopPropagation();
    };
    const handleDragLeave = () => {
        sDragDepth.current = Math.max(0, sDragDepth.current - 1);
        if (sDragDepth.current === 0) setIsDragging(false);
    };
    const handleDrop = (aEvent: React.DragEvent) => {
        aEvent.preventDefault();
        sDragDepth.current = 0;
        setIsDragging(false);
        handleChange(aEvent.dataTransfer.files[0]);
    };

    // ---------- widget board ----------
    const { nodes: sSavedNodes, save: saveLayout } = useNewTabLayout();
    const sStatz = useStatzAccess();
    const { groups: sGroups, saveGroup, deleteGroup } = useNewTabGroups();
    const [sEditing, setEditing] = useState(false);
    const [sDraft, setDraft] = useState<SectionNode[]>(sSavedNodes);
    const [sSelectedSection, setSelectedSection] = useState<string | undefined>(undefined);
    const [sUndo, setUndo] = useState<{ message: string; nodes: SectionNode[] } | undefined>(undefined);
    const [sPanelOpen, setPanelOpen] = useState(true);
    const [sGroupModal, setGroupModal] = useState<{ group?: Group; missing?: Set<string> } | undefined>(undefined);
    const [sPickerGroup, setPickerGroup] = useState<Group | undefined>(undefined);
    const [sSettingsNode, setSettingsNode] = useState<WidgetNode | undefined>(undefined);
    const sNodes = sEditing ? sDraft : sSavedNodes;

    const startEditing = () => {
        setDraft(sSavedNodes);
        setSelectedSection(undefined);
        setUndo(undefined);
        setPanelOpen(true);
        setEditing(true);
    };
    const finishEditing = async () => {
        if (await saveLayout(sDraft)) Toast.success('New tab saved', { id: 'new-tab-layout-save' });
        setEditing(false);
        setUndo(undefined);
    };
    const changeDraft = (aNodes: SectionNode[], aUndoMessage?: string) => {
        if (aUndoMessage) setUndo({ message: aUndoMessage, nodes: sDraft });
        setDraft(aNodes);
    };

    const widgetLabel = (aNode: WidgetNode) => {
        if (aNode.type === 'group') return sGroups.find((aGroup) => aGroup.id === aNode.groupId)?.name ?? 'Deleted group';
        if (aNode.type === 'clock') return String((aNode.settings as ClockSettings | undefined)?.label || (aNode.settings as ClockSettings | undefined)?.timeZone || 'Clock');
        // if (aNode.type === 'weather') return String((aNode.settings as WeatherSettings | undefined)?.place?.name ?? 'Weather');
        if (aNode.type === 'item') return isItemSettings(aNode.settings) ? aNode.settings.label : 'Shortcut';
        return BUILTIN_WIDGETS[aNode.type].title;
    };

    const removeFromDraft = (aId: string) => {
        const sFound = findNode(sDraft, aId);
        const sResult = removeNode(sDraft, aId);
        if (!sFound || !sResult.ok) return;
        const sLabel = sFound.node.kind === 'section' ? sFound.node.title || 'Untitled section' : widgetLabel(sFound.node);
        if (sSelectedSection && (sSelectedSection === aId || !findNode(sResult.nodes, sSelectedSection))) setSelectedSection(undefined);
        changeDraft(sResult.nodes, sFound.node.kind === 'widget' && sFound.node.type === 'group' ? `Removed ${sLabel}. The group itself is kept.` : `Removed ${sLabel}.`);
    };

    const addFromPanel = (aCreate: () => LayoutNode) => {
        const sNode = aCreate();
        const sResult = insertNode(sDraft, sNode, sSelectedSection ?? looseWidgetSection(sDraft, sNode));
        if (!sResult.ok) return Toast.error(sResult.reason, { id: 'new-tab-layout-refused' });
        changeDraft(sResult.nodes);
        if (sNode.kind === 'section') setSelectedSection(sNode.id);
    };

    /** Widget options change the saved layout directly when not editing (e.g. a weather widget's first place). */
    const saveWidgetSettings = (aNode: WidgetNode, aSettings: Record<string, unknown>) => {
        if (sEditing) setDraft(updateNode(sDraft, aNode.id, { settings: aSettings }));
        else saveLayout(updateNode(sSavedNodes, aNode.id, { settings: aSettings }));
    };

    const handleSaveGroup = async (aGroup: Group, aPrevious?: Group['visibility']) => {
        const sIsNew = !sGroups.some((aOld) => aOld.id === aGroup.id);
        const sOk = await saveGroup(aGroup, aPrevious);
        if (sOk && sIsNew) {
            // A group made from the panel lands where widgets would, and is ready for items.
            const sResult = insertNode(sEditing ? sDraft : sSavedNodes, createWidget('group', 2, aGroup.id), sEditing ? sSelectedSection : undefined);
            if (sResult.ok) {
                if (sEditing) setDraft(sResult.nodes);
                else saveLayout(sResult.nodes);
            }
            setPickerGroup(aGroup);
        }
        return sOk;
    };
    const handleDeleteGroup = async (aGroup: Group) => {
        const sOk = await deleteGroup(aGroup);
        if (sOk) {
            saveLayout(removeGroupWidgets(sSavedNodes, aGroup.id));
            if (sEditing) setDraft(removeGroupWidgets(sDraft, aGroup.id));
            Toast.success(`Deleted ${aGroup.name}`, { id: 'new-tab-group-save' });
        }
        return sOk;
    };
    const addItemsToGroup = async (aItems: GroupItem[]) => {
        if (!sPickerGroup) return false;
        const sCurrent = sGroups.find((aGroup) => aGroup.id === sPickerGroup.id) ?? sPickerGroup;
        const sKnown = new Set(sCurrent.items.map(itemKey));
        return saveGroup({ ...sCurrent, items: [...sCurrent.items, ...aItems.filter((aItem) => !sKnown.has(itemKey(aItem)))] });
    };

    const renderCreate = () => (
        <div className="new-board-cards">
            {sCreateItems.map((aItem: any) => {
                const sInfo = CARD_INFO[aItem.type];
                return (
                    <button
                        type="button"
                        key={aItem.id}
                        className="new-board-card"
                        data-testid={`new-board-${aItem.type}`}
                        onClick={(aEvent) => changeTabOption(aEvent, aItem)}
                        onMouseEnter={() => setHoveredCard(aItem.id)}
                        onMouseLeave={() => setHoveredCard(undefined)}
                        onFocus={() => setHoveredCard(aItem.id)}
                        onBlur={() => setHoveredCard(undefined)}
                    >
                        <span className="new-board-card-preview">
                            <BoardPreview pType={aItem.type} pActive={sHoveredCard === aItem.id} pFallback={<span className="new-board-card-icon">{setIcon(aItem)}</span>} />
                        </span>
                        <span className="new-board-card-body">
                            <span className="new-board-card-title">
                                <span className="new-board-card-type-icon">{icons(aItem.type)}</span>
                                <span className="new-board-card-name">{sInfo?.title ?? aItem.label}</span>
                                <span className="new-board-ext">.{aItem.type}</span>
                            </span>
                            {sInfo ? <span className="new-board-card-desc">{sInfo.description}</span> : null}
                        </span>
                    </button>
                );
            })}
            <label
                className="new-board-card"
                data-testid="new-board-open-file"
                tabIndex={0}
                onKeyDown={(aEvent) => {
                    if (aEvent.key !== 'Enter' && aEvent.key !== ' ') return;
                    aEvent.preventDefault();
                    sFileInput.current?.click();
                }}
            >
                <input
                    ref={sFileInput}
                    tabIndex={-1}
                    className="new-board-file-input"
                    data-testid="new-board-open-file-input"
                    type="file"
                    accept={OPEN_FILE_ACCEPT}
                    onChange={(aEvent) => {
                        handleChange(aEvent.target.files?.[0]);
                        aEvent.target.value = '';
                    }}
                />
                <span className="new-board-card-preview">
                    <BoardPreview pType="open" />
                </span>
                <span className="new-board-card-body">
                    <span className="new-board-card-title">
                        <span className="new-board-card-name">Open a file</span>
                        <span className="new-board-ext">from disk</span>
                    </span>
                    <span className="new-board-card-desc">Bring in a file you already have, or drop it anywhere on this page.</span>
                </span>
            </label>
        </div>
    );

    const renderExamples = () => (
        <div className="new-board-template-list">
            {STARTER_TEMPLATES.filter((aTemplate) => !aTemplate.needsStatz || sStatz === 'yes').map((aTemplate) => (
                <button type="button" key={aTemplate.id} className="new-board-template" data-testid={`new-board-template-${aTemplate.id}`} onClick={() => openTemplate(aTemplate)}>
                    <span className="new-board-template-title">{aTemplate.title}</span>
                    <span className="new-board-template-go" aria-hidden="true">
                        Open →
                    </span>
                    <span className="new-board-template-summary">{aTemplate.summary}</span>
                    <pre>{aTemplate.snippet}</pre>
                </button>
            ))}
        </div>
    );

    const renderRecent = (aSize: WidgetSize) => (
        <div className="new-board-recent-list" data-testid="new-board-recent">
            {sRecentFiles.length === 0 ? (
                <p className="new-board-empty">
                    Files you open or save will show up here.
                    <br />
                    Try an example to make your first one.
                </p>
            ) : (
                sRecentFiles.slice(0, aSize === 1 ? 4 : undefined).map((aFile) => {
                    const sExt = extractionExtension(aFile.name);
                    return (
                        <button type="button" key={aFile.path + aFile.name} className="new-board-recent-item" data-testid={`recent-${encodeURIComponent(aFile.path + aFile.name)}`} onClick={() => openRecent(aFile)}>
                            <span className="new-board-recent-icon">{icons(sExt)}</span>
                            <span className="new-board-recent-name">
                                {aFile.name}
                                <small>{aFile.path}</small>
                            </span>
                            <time dateTime={new Date(aFile.openedAt).toISOString()}>{moment(aFile.openedAt).fromNow()}</time>
                        </button>
                    );
                })
            )}
        </div>
    );

    const renderWidget = (aNode: WidgetNode): React.ReactNode => {
        switch (aNode.type) {
            case 'pulse':
                return <ServerPulse pIsActive={pIsActiveTab} pIsOpeningDashboard={sIsLoadingStatz} pOnOpenDashboard={openNeoStatzDashboard} />;
            case 'create':
                return renderCreate();
            case 'shells':
                return <ShellCards pShells={sShellItems} pRenderIcon={setIcon} pOnOpen={changeTabOption} pOnCreate={openShellCreate} />;
            case 'examples':
                return renderExamples();
            case 'recent':
                return renderRecent(aNode.size);
            case 'references':
                return <ReferencesWidget pLabel="REFERENCES" />;
            case 'sdk':
                return <ReferencesWidget pLabel="SDK" />;
            case 'clock':
                return <ClockWidget pSettings={aNode.settings as ClockSettings} pActive={pIsActiveTab} />;
            case 'calendar':
                return <CalendarWidget pSettings={aNode.settings as CalendarSettings} pActive={pIsActiveTab} />;
            // case 'weather':
            //     return <WeatherWidget pSettings={aNode.settings as WeatherSettings} pActive={pIsActiveTab} pOnConfigure={() => setSettingsNode(aNode)} />;
            case 'item':
                return isItemSettings(aNode.settings) ? <ItemWidget pSettings={aNode.settings} pActive={pIsActiveTab} /> : null;
            case 'group':
                return (
                    <GroupWidget
                        pGroup={sGroups.find((aGroup) => aGroup.id === aNode.groupId)}
                        pSize={aNode.size}
                        pActive={pIsActiveTab}
                        pOnEdit={(aGroup, aMissing) => setGroupModal({ group: aGroup, missing: aMissing })}
                        pOnAddItems={(aGroup) => setPickerGroup(aGroup)}
                    />
                );
            default:
                return null;
        }
    };

    const sSelectedFound = sSelectedSection ? findNode(sDraft, sSelectedSection) : undefined;
    const sTargetLabel = sSelectedFound && sSelectedFound.node.kind === 'section' ? sSelectedFound.node.title || 'Untitled section' : undefined;

    return (
        <Page>
            <Page.Header>
                <span>New...</span>
                {sEditing ? (
                    <span className="nb-head-actions">
                        <Button size="sm" variant="ghost" data-testid="new-board-reset" onClick={() => changeDraft(createDefaultLayout(), 'Back to the default New tab.')}>
                            Reset to default
                        </Button>
                        {!sPanelOpen ? (
                            <Button size="sm" variant="secondary" onClick={() => setPanelOpen(true)}>
                                Widgets
                            </Button>
                        ) : null}
                        <Button size="sm" variant="secondary" data-testid="new-board-cancel" onClick={() => setEditing(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" variant="primary" data-testid="new-board-done" onClick={finishEditing}>
                            Done
                        </Button>
                    </span>
                ) : (
                    <Button size="sm" variant="secondary" data-testid="new-board-customize" onClick={startEditing} icon={<CustomizeIcon />}>
                        Customize
                    </Button>
                )}
            </Page.Header>
            <Page.Body>
                <div className={`new-board-workspace${sEditing && sPanelOpen ? ' has-panel' : ''}`}>
                    <div
                        className={`new-board${sEditing ? ' is-editing' : ''}`}
                        data-testid="new-board"
                        onDragEnter={sEditing ? undefined : handleDragEnter}
                        onDragOver={sEditing ? undefined : handleDragOver}
                        onDragLeave={sEditing ? undefined : handleDragLeave}
                        onDrop={sEditing ? undefined : handleDrop}
                        onClick={sEditing ? () => setSelectedSection(undefined) : undefined}
                    >
                        <div className="new-board-inner">
                            {sEditing ? (
                                <div className="nb-editbar" role="status">
                                    {sUndo ? (
                                        <>
                                            <span>{sUndo.message}</span>
                                            <button
                                                type="button"
                                                className="nb-link-btn"
                                                data-testid="new-board-undo"
                                                onClick={(aEvent) => {
                                                    aEvent.stopPropagation();
                                                    setDraft(sUndo.nodes);
                                                    setUndo(undefined);
                                                }}
                                            >
                                                Undo
                                            </button>
                                        </>
                                    ) : (
                                        <span>Select a section to add widgets into it. Move sections with ⋮⋮ or ↑ ↓ and widgets with ⋮⋮ or ← →. 1–4 sets how many of the row's four columns a widget takes; drag a section's bottom edge to change its height.</span>
                                    )}
                                </div>
                            ) : null}
                            <LayoutBoard
                                pNodes={sEditing ? sNodes : hideUnavailable(sNodes, (aWidget) => isWidgetAvailable(aWidget, sStatz))}
                                pEditing={sEditing}
                                pSelectedId={sSelectedSection}
                                pOnSelect={setSelectedSection}
                                pOnChange={(aNodes) => changeDraft(aNodes)}
                                pOnRemove={removeFromDraft}
                                pOnRefused={(aReason) => Toast.error(aReason, { id: 'new-tab-layout-refused' })}
                                pRenderWidget={renderWidget}
                                pWidgetLabel={widgetLabel}
                                pOnConfigure={setSettingsNode}
                                pUnavailable={(aWidget) => (isWidgetAvailable(aWidget, sStatz) ? undefined : sStatz === 'checking' ? 'Checking access' : UNAVAILABLE_REASON)}
                            />
                            {!sNodes.length && !sEditing ? (
                                <p className="new-board-empty">
                                    Your New tab is empty. Press Customize to add widgets, or choose Reset to default there.
                                </p>
                            ) : null}
                        </div>

                        {sIsDragging ? (
                            <div className="new-board-drop-overlay" aria-hidden="true">
                                <div>
                                    <b>Drop to open</b>
                                    <span>{OPEN_FILE_ACCEPT.split(',').join('  ')}</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {sEditing && sPanelOpen ? (
                        <WidgetPanel
                            pNodes={sDraft}
                            pGroups={sGroups}
                            pTargetLabel={sTargetLabel}
                            pOnAdd={addFromPanel}
                            pOnNewGroup={() => setGroupModal({})}
                            pOnClose={() => setPanelOpen(false)}
                            pUnavailable={(aType) => (isWidgetAvailable({ type: aType }, sStatz) ? undefined : sStatz === 'checking' ? 'Checking access' : UNAVAILABLE_REASON)}
                        />
                    ) : null}
                </div>
                {sGroupModal ? (
                    <GroupEditModal
                        pGroup={sGroupModal.group}
                        pMissing={sGroupModal.missing}
                        pDefaultColor={GROUP_COLORS[sGroups.length % GROUP_COLORS.length]}
                        pOnSave={handleSaveGroup}
                        pOnDelete={handleDeleteGroup}
                        pOnClose={() => setGroupModal(undefined)}
                    />
                ) : null}
                {sPickerGroup ? <GroupItemPicker pGroup={sGroups.find((aGroup) => aGroup.id === sPickerGroup.id) ?? sPickerGroup} pOnAdd={addItemsToGroup} pOnClose={() => setPickerGroup(undefined)} /> : null}
                {sSettingsNode ? <WidgetSettingsModal pNode={sSettingsNode} pOnSave={(aSettings) => saveWidgetSettings(sSettingsNode, aSettings)} pOnClose={() => setSettingsNode(undefined)} /> : null}
            </Page.Body>
        </Page>
    );
};

const SMALL_WIDGETS = new Set<WidgetNode['type']>(['item', 'clock', 'calendar', 'weather', 'group']);

/**
 * With no section selected, small widgets added one after another should share a row rather than
 * each opening a row of its own: reuse the last section when it is an untitled one holding only them.
 */
const looseWidgetSection = (aNodes: SectionNode[], aNode: LayoutNode): string | undefined => {
    if (aNode.kind !== 'widget' || !SMALL_WIDGETS.has(aNode.type)) return undefined;
    const sLast = aNodes[aNodes.length - 1];
    if (!sLast || sLast.title || !sLast.children.length) return undefined;
    return sLast.children.every((aChild) => aChild.kind === 'widget' && SMALL_WIDGETS.has(aChild.type)) ? sLast.id : undefined;
};

const CustomizeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 4h7M12 4h2M2 12h2M7 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10.5" cy="4" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="5.5" cy="12" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);
export default NewBoard;
