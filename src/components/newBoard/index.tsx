import './index.scss';
import { useRecoilState, useRecoilValue } from 'recoil';
import moment from 'moment';
import { gBoardList, gSelectedTab, gShellList } from '@/recoil/recoil';
import icons from '@/utils/icons';
import { extractionExtension } from '@/utils';
import { useMemo, useRef, useState } from 'react';
import { Page, Toast } from '@/design-system/components';
import { TAZ_FORMAT_VERSION } from '@/components/tagAnalyzer/persistence/tazFormat';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';
import { RecentFile, recordRecentFile, removeRecentFile, useRecentFiles } from '@/utils/recentFiles';
import { BoardPreview } from './BoardPreview';
import { ServerPulse } from './ServerPulse';
import { ShellCards } from './ShellCards';
import { useOpenShellCreate } from '@/components/side/Shell/useOpenShellCreate';
import { loadNeoStatzDashboard, NEO_STATZ_DASHBOARD, STARTER_TEMPLATES, StarterTemplate } from './starterTemplates';

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

const OPENABLE_EXTENSIONS = ['wrk', 'sql', 'tql', 'taz', 'dsh', 'json', 'csv', 'md', 'txt'];
const FILE_INPUT_ACCEPT = '.wrk,.sql,.tql,.taz,.dsh';

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
    const sIsFirstVisit = sRecentFiles.length === 0;

    /** Turn this New tab into something else, keeping its id. */
    const replaceCurrentTab = (aFields: Record<string, any>) => {
        setBoardList(sBoardList.map((aItem: any) => (aItem.id === sSelectedTab ? { ...aItem, ...aFields, id: aItem.id } : aItem)));
    };

    const readFile = async (aItem: any) => {
        return (await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e: any) => {
                resolve(e.target.result);
            };
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
        uploadFile(aFile, await readFile(aFile));
    };

    const uploadFile = (aFileInfo: File, aFileValue: string) => {
        const sTypeOption = extractionExtension(aFileInfo.name);

        if (sTypeOption === 'taz' || sTypeOption === 'dsh') {
            setBoardList(
                sBoardList.map((aItem: any) => {
                    return aItem.id === sSelectedTab ? { ...JSON.parse(aFileValue), id: aItem.id } : aItem;
                })
            );
        } else if (sTypeOption === 'sql' || sTypeOption === 'tql' || sTypeOption === 'json' || sTypeOption === 'csv' || sTypeOption === 'md' || sTypeOption === 'txt') {
            replaceCurrentTab({ name: aFileInfo.name, code: aFileValue, type: sTypeOption });
        } else if (sTypeOption === 'wrk') {
            replaceCurrentTab({ name: aFileInfo.name, sheet: JSON.parse(aFileValue).data, type: sTypeOption });
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

    return (
        <Page>
            <Page.Header>New...</Page.Header>
            <Page.Body>
                <div
                    className="new-board"
                    data-testid="new-board"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="new-board-inner">
                        <ServerPulse pIsActive={pIsActiveTab} pIsOpeningDashboard={sIsLoadingStatz} pOnOpenDashboard={openNeoStatzDashboard} />

                        <section className="new-board-section">
                            <div className="new-board-section-head">
                                <h2>Create new</h2>
                                <small>Each card shows what you will end up with</small>
                            </div>
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
                                                <BoardPreview
                                                    pType={aItem.type}
                                                    pActive={sHoveredCard === aItem.id}
                                                    pFallback={<span className="new-board-card-icon">{setIcon(aItem)}</span>}
                                                />
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
                                        type="file"
                                        accept={FILE_INPUT_ACCEPT}
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
                            <div className="new-board-subhead">
                                <h3>Shells</h3>
                                <small>Terminals on the server, opened in a tab</small>
                            </div>
                            <ShellCards pShells={sShellItems} pRenderIcon={setIcon} pOnOpen={changeTabOption} pOnCreate={openShellCreate} />
                        </section>

                        <div className={`new-board-split${sIsFirstVisit ? '' : ' new-board-split--returning'}`}>
                            <section className="new-board-section new-board-templates">
                                <div className="new-board-section-head">
                                    <h2>Try it in one click</h2>
                                    <small>Works on a fresh server, no tables to create</small>
                                </div>
                                <div className="new-board-template-list">
                                    {STARTER_TEMPLATES.map((aTemplate) => (
                                        <button
                                            type="button"
                                            key={aTemplate.id}
                                            className="new-board-template"
                                            data-testid={`new-board-template-${aTemplate.id}`}
                                            onClick={() => openTemplate(aTemplate)}
                                        >
                                            <span className="new-board-template-title">{aTemplate.title}</span>
                                            <span className="new-board-template-go" aria-hidden="true">
                                                Open →
                                            </span>
                                            <span className="new-board-template-summary">{aTemplate.summary}</span>
                                            <pre>{aTemplate.snippet}</pre>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="new-board-section new-board-recent">
                                <div className="new-board-section-head">
                                    <h2>Recent</h2>
                                    <small>On this browser</small>
                                </div>
                                <div className="new-board-recent-list" data-testid="new-board-recent">
                                    {sRecentFiles.length === 0 ? (
                                        <p className="new-board-empty">
                                            Files you open or save will show up here.
                                            <br />
                                            Try an example to make your first one.
                                        </p>
                                    ) : (
                                        sRecentFiles.map((aFile) => {
                                            const sExt = extractionExtension(aFile.name);
                                            return (
                                                <button type="button" key={aFile.path + aFile.name} className="new-board-recent-item" onClick={() => openRecent(aFile)}>
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
                            </section>
                        </div>
                    </div>

                    {sIsDragging ? (
                        <div className="new-board-drop-overlay" aria-hidden="true">
                            <div>
                                <b>Drop to open</b>
                                <span>{FILE_INPUT_ACCEPT.split(',').join('  ')}</span>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Page.Body>
        </Page>
    );
};
export default NewBoard;
