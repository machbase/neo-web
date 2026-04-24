import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import type { ReactNode } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gRollupTableList, gSelectedTab, gTables } from '@/recoil/recoil';
import { postFileList } from '@/api/repository/api';
import {
    createTagAnalyzerBoardSourceInfoFixture,
    createTagAnalyzerEditRequestFixture as mockCreateTagAnalyzerEditRequestFixture,
    createTagAnalyzerPanelInfoFixture,
    createOverlapPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from './TestData/PanelTestData';
import type {
    BoardPanelActions,
    BoardPanelState,
} from './utils/boardTypes';
import type { PersistedTazBoardInfo } from './utils/persistence/TazPersistenceTypes';
import { resolveTimeBoundaryRanges } from './utils/time/TimeBoundaryRangeResolver';
import { getNextOverlapPanels } from './modal/OverlapComparisonUtils';
import {
    fetchParsedTables,
    getRollupTableList,
} from './utils/fetch/TagAnalyzerDataRepository';
import TagAnalyzer from './TagAnalyzer';

// Used by TagAnalyzer tests to type mock board props.
type MockBoardProps = {
    pPanelBoardActions: BoardPanelActions;
    pPanelBoardState: BoardPanelState;
};

// Used by TagAnalyzer tests to type mock toolbar props.
type MockToolbarProps = {
    pRange: {
        min: number;
        max: number;
    };
    pActionHandlers: {
        onOpenTimeRangeModal: () => void;
        onRefreshData: () => void;
        onRefreshTime: () => void | Promise<void>;
        onSave: () => void;
        onOpenSaveModal: () => void;
        onOpenOverlapModal: () => void;
    };
};

const setTablesMock = jest.fn();
const setRollupTablesMock = jest.fn();
const setBoardListMock = jest.fn();
const handleSaveModalOpenMock = jest.fn();
const setIsSaveModalMock = jest.fn();
const fetchParsedTablesMock = jest.mocked(fetchParsedTables);
const getRollupTableListMock = jest.mocked(getRollupTableList);
const postFileListMock = jest.mocked(postFileList);
const useRecoilValueMock = jest.mocked(useRecoilValue);
const useSetRecoilStateMock = jest.mocked(useSetRecoilState);
const resolveTimeBoundaryRangesMock = jest.mocked(resolveTimeBoundaryRanges);

let sLatestBoardProps: MockBoardProps | undefined;
let sLatestToolbarProps: MockToolbarProps | undefined;

jest.mock('./utils/fetch/TagAnalyzerDataRepository', () => {
    const sActual = jest.requireActual('./utils/fetch/TagAnalyzerDataRepository');
    return {
        ...sActual,
        fetchParsedTables: jest.fn(),
        getRollupTableList: jest.fn(),
    };
});

jest.mock('@/api/repository/api', () => ({
    ...jest.requireActual('@/api/repository/api'),
    postFileList: jest.fn(),
}));

jest.mock('recoil', () => {
    const sActual = jest.requireActual('recoil');
    return {
        ...sActual,
        useRecoilValue: jest.fn(),
        useSetRecoilState: jest.fn(),
    };
});

jest.mock('./utils/time/TimeBoundaryRangeResolver', () => ({
    ...jest.requireActual('./utils/time/TimeBoundaryRangeResolver'),
    resolveTimeBoundaryRanges: jest.fn(),
}));

jest.mock('@/design-system/components', () => {
    /**
     * Renders the mocked page container used in TagAnalyzer tests.
     * Intent: Preserve the page wrapper contract without pulling in the real design-system implementation.
     * @param {{ children: ReactNode }} props The page children to render.
     * @returns {JSX.Element} The mocked page container.
     */
    const MockDesignSystemPage = ({ children }: { children: ReactNode }) => (
        <div data-testid="page">{children}</div>
    );
    MockDesignSystemPage.Body = ({ children }: { children: ReactNode }) => (
        <div data-testid="page-body">{children}</div>
    );
    MockDesignSystemPage.ContentBlock = ({ children }: { children: ReactNode }) => (
        <div data-testid="page-content">{children}</div>
    );
    /**
     * Renders the mocked button used in TagAnalyzer tests.
     * Intent: Keep the action wiring testable while avoiding the full design-system button component.
     * @param {{ children: ReactNode; onClick: (() => void) | undefined; }} props The mocked button props.
     * @returns {JSX.Element} The mocked button element.
     */
    const MockDesignSystemButton = ({
        children,
        onClick,
    }: {
        children: ReactNode;
        onClick: (() => void) | undefined;
    }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    );
    MockDesignSystemButton.Group = ({ children }: { children: ReactNode }) => <div>{children}</div>;

    return {
        Button: MockDesignSystemButton,
        Page: MockDesignSystemPage,
        Toast: {
            error: jest.fn(),
        },
    };
});

jest.mock('./TagAnalyzerBoardToolbar', () => {
    /**
     * Renders the mocked board toolbar used by TagAnalyzer tests.
     * Intent: Capture toolbar wiring without rendering the real toolbar implementation.
     * @param {MockToolbarProps} props The mocked toolbar props.
     * @returns {JSX.Element} The mocked toolbar markup.
     */
    const MockTagAnalyzerBoardToolbar = (props: MockToolbarProps) => {
        sLatestToolbarProps = props;

        return (
            <div data-testid="tag-toolbar">
                <button type="button" onClick={props.pActionHandlers.onRefreshData}>
                    refresh-data
                </button>
                <button type="button" onClick={props.pActionHandlers.onRefreshTime}>
                    refresh-time
                </button>
                <button type="button" onClick={props.pActionHandlers.onOpenTimeRangeModal}>
                    open-time-range
                </button>
                <button type="button" onClick={props.pActionHandlers.onOpenOverlapModal}>
                    open-overlap
                </button>
                <button type="button" onClick={props.pActionHandlers.onSave}>
                    save
                </button>
                <button type="button" onClick={props.pActionHandlers.onOpenSaveModal}>
                    open-save-modal
                </button>
            </div>
        );
    };

    return MockTagAnalyzerBoardToolbar;
});

jest.mock('./TagAnalyzerBoard', () => {
    /**
     * Renders the mocked board panel used by TagAnalyzer tests.
     * Intent: Capture board action wiring without rendering the real board implementation.
     * @param {MockBoardProps} props The mocked board props.
     * @returns {JSX.Element} The mocked board markup.
     */
    const MockTagAnalyzerBoard = (props: MockBoardProps) => {
        sLatestBoardProps = props;

        return (
            <div data-testid="tag-board">
                <div data-testid="refresh-count">{String(props.pPanelBoardState.refreshCount)}</div>
                <button
                    type="button"
                    onClick={() =>
                        props.pPanelBoardActions.onOpenEditRequest(
                            mockCreateTagAnalyzerEditRequestFixture(undefined),
                        )
                    }
                >
                    open-edit
                </button>
                <button
                    type="button"
                    onClick={() => props.pPanelBoardActions.onDeletePanel({ panelKey: 'panel-1' })}
                >
                    delete-panel
                </button>
            </div>
        );
    };

    return MockTagAnalyzerBoard;
});

jest.mock('./modal/CreateChartModal', () => {
    /**
     * Renders the mocked create-chart modal used by TagAnalyzer tests.
     * Intent: Stub the modal so the top-level controller can be tested in isolation.
     * @returns {null} No markup is rendered by the mock modal.
     */
    const MockCreateChartModal = () => {
        return null;
    };

    return MockCreateChartModal;
});

jest.mock('./modal/OverlapModal', () => {
    /**
     * Renders the mocked overlap modal used by TagAnalyzer tests.
     * Intent: Stub the modal so overlap visibility can be asserted without the real implementation.
     * @returns {JSX.Element} The mocked overlap modal markup.
     */
    const MockOverlapModal = () => {
        return <div data-testid="overlap-modal" />;
    };

    return MockOverlapModal;
});

jest.mock('./TazSaveModal', () => {
    /**
     * Renders the mocked TagAnalyzer save modal used by TagAnalyzer tests.
     * Intent: Keep top-level controller tests independent from the local save dialog's Recoil state.
     * @returns {JSX.Element | null} The mocked save modal markup.
     */
    const MockTazSaveModal = ({ isOpen }: { isOpen: boolean }) => {
        return isOpen ? <div data-testid="taz-save-modal" /> : null;
    };

    return MockTazSaveModal;
});

jest.mock('../modal/TimeRangeModal', () => {
    /**
     * Renders the mocked time-range modal used by TagAnalyzer tests.
     * Intent: Capture modal callbacks without depending on the real modal UI.
     * @param {{ pSetTimeRangeModal: Dispatch<SetStateAction<boolean>>; pSaveCallback: ((aStart: number, aEnd: number) => void) | undefined; }} props The mocked modal props.
     * @returns {JSX.Element} The mocked time-range modal markup.
     */
    const MockTimeRangeModal = ({
        pSetTimeRangeModal,
        pSaveCallback,
    }: {
        pSetTimeRangeModal: Dispatch<SetStateAction<boolean>>;
        pSaveCallback: ((aStart: number, aEnd: number) => void) | undefined;
    }) => {
        return (
            <div data-testid="time-range-modal">
                <button type="button" onClick={() => pSaveCallback?.(111, 222)}>
                    save-time-range
                </button>
                <button type="button" onClick={() => pSetTimeRangeModal(false)}>
                    close-time-range
                </button>
            </div>
        );
    };

    return MockTimeRangeModal;
});

jest.mock('./editor/PanelEditor', () => {
    /**
     * Renders the mocked panel editor used by TagAnalyzer tests.
     * Intent: Keep editor open/close flows testable without the full editor implementation.
     * @param {{ pSetEditPanel: () => void }} props The mocked editor props.
     * @returns {JSX.Element} The mocked panel editor markup.
     */
    const MockPanelEditor = ({ pSetEditPanel }: { pSetEditPanel: () => void }) => {
        return (
            <div data-testid="panel-editor">
                <button type="button" onClick={pSetEditPanel}>
                    close-editor
                </button>
            </div>
        );
    };

    return MockPanelEditor;
});

/**
 * Builds the top-level TagAnalyzer props used by the controller boundary test.
 * Intent: Keep the controller-boundary tests focused on a predictable board fixture.
 * @param {Partial<PersistedTazBoardInfo>} aOverrides The board-source fields to override.
 * @returns {{ pInfo: PersistedTazBoardInfo; pHandleSaveModalOpen: () => void; pSetIsSaveModal: Dispatch<SetStateAction<boolean>>; }} The complete TagAnalyzer prop bundle for the focused boundary tests.
 */
const createProps = (aOverrides: Partial<PersistedTazBoardInfo> = {}) => ({
    pInfo: createTagAnalyzerBoardSourceInfoFixture(aOverrides),
    pHandleSaveModalOpen: handleSaveModalOpenMock,
    pSetIsSaveModal: setIsSaveModalMock,
});

describe('TagAnalyzer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestBoardProps = undefined;
        sLatestToolbarProps = undefined;

        useRecoilValueMock.mockImplementation((aAtom) => {
            if (aAtom === gSelectedTab) {
                return 'board-1';
            }

            return undefined;
        });

        useSetRecoilStateMock.mockImplementation((aAtom) => {
            if (aAtom === gTables) return setTablesMock;
            if (aAtom === gRollupTableList) return setRollupTablesMock;
            if (aAtom === gBoardList) return setBoardListMock;
            return jest.fn();
        });

        fetchParsedTablesMock.mockResolvedValue(['TABLE_A'] as never);
        getRollupTableListMock.mockResolvedValue(['ROLLUP_TABLE'] as never);
        postFileListMock.mockResolvedValue({ success: true } as never);
        resolveTimeBoundaryRangesMock.mockResolvedValue({
            start: { min: 10, max: 10 },
            end: { min: 20, max: 20 },
        } as never);
    });

    it('loads workspace metadata and keeps the top-level toolbar, modals, and editor wiring intact', async () => {
        // Confirms the controller split preserves the visible top-level workflow contracts.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });

        expect(setTablesMock).toHaveBeenCalledWith(['TABLE_A']);
        expect(setRollupTablesMock).toHaveBeenCalledWith(['ROLLUP_TABLE']);
        expect(resolveTimeBoundaryRangesMock).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    sourceTagName: 'temp_sensor',
                }),
            ]),
            { bgn: 'now-1h', end: 'now' },
            { bgn: '', end: '' },
        );

        fireEvent.click(screen.getByText('refresh-data'));
        expect(screen.getByTestId('refresh-count')).toHaveTextContent('1');

        fireEvent.click(screen.getByText('open-time-range'));
        expect(screen.getByTestId('time-range-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('save-time-range'));
        await waitFor(() => {
            expect(resolveTimeBoundaryRangesMock).toHaveBeenCalledWith(
                expect.any(Array),
                { bgn: 111, end: 222 },
                { bgn: '', end: '' },
            );
        });

        fireEvent.click(screen.getByText('open-overlap'));
        expect(screen.getByTestId('overlap-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('open-edit'));
        expect(screen.getByTestId('panel-editor')).toBeInTheDocument();

        fireEvent.click(screen.getByText('close-editor'));
        expect(screen.getByTestId('tag-board')).toBeInTheDocument();

        fireEvent.click(screen.getByText('save'));
        fireEvent.click(screen.getByText('open-save-modal'));
        await waitFor(() => {
            expect(postFileListMock).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByTestId('taz-save-modal')).toBeInTheDocument();
        expect(sLatestToolbarProps).toEqual(
            expect.objectContaining({
                pRange: expect.objectContaining({
                    min: expect.any(Number),
                    max: expect.any(Number),
                }),
            }),
        );
        expect(sLatestBoardProps).toBeDefined();
    });

    it('routes board delete requests through the stored board-list updater', async () => {
        // Confirms the top-level controller still owns board mutation wiring after the extraction.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });
        setBoardListMock.mockClear();

        fireEvent.click(screen.getByText('delete-panel'));

        expect(setBoardListMock).toHaveBeenCalledWith(expect.any(Function));

        const sUpdateBoardList = setBoardListMock.mock.calls[0][0] as (
            aBoards: PersistedTazBoardInfo[],
        ) => PersistedTazBoardInfo[];
        const sResult = sUpdateBoardList([createTagAnalyzerBoardSourceInfoFixture(undefined)]);

        expect(sResult[0].panels).toEqual([]);
    });

    it('keeps overlap panel state referentially stable when a changed update does not match any selected panel', () => {
        // Confirms unrelated panel range changes do not force board rerenders through overlap state churn.
        const sOverlapPanels = [createOverlapPanelInfoFixture(undefined)];
        const sNextPanels = getNextOverlapPanels(
            sOverlapPanels,
            {
                start: 300,
                end: 450,
                panel: createTagAnalyzerPanelInfoFixture({
                    meta: { index_key: 'panel-2' },
                }),
                isRaw: false,
                changeType: 'changed',
            },
        );

        expect(sNextPanels).toBe(sOverlapPanels);
    });

    it('debounces persisted panel state writes so transient range updates share one board-list update', async () => {
        // Confirms repeated panel persistence requests settle into one global board update using the latest range.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });

        expect(sLatestBoardProps).toBeDefined();
        setBoardListMock.mockClear();
        jest.useFakeTimers();

        try {
            sLatestBoardProps!.pPanelBoardActions.onPersistPanelState(
                {
                    targetPanelKey: 'panel-1',
                    timeInfo: {
                        panelRange: createTagAnalyzerTimeRangeFixture({
                            startTime: 100,
                            endTime: 200,
                        }),
                        navigatorRange: createTagAnalyzerTimeRangeFixture({
                            startTime: 50,
                            endTime: 250,
                        }),
                    },
                    isRaw: false,
                },
            );
            sLatestBoardProps!.pPanelBoardActions.onPersistPanelState(
                {
                    targetPanelKey: 'panel-1',
                    timeInfo: {
                        panelRange: createTagAnalyzerTimeRangeFixture({
                            startTime: 300,
                            endTime: 450,
                        }),
                        navigatorRange: createTagAnalyzerTimeRangeFixture({
                            startTime: 250,
                            endTime: 500,
                        }),
                    },
                    isRaw: true,
                },
            );

            expect(setBoardListMock).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(149);
            });
            expect(setBoardListMock).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(1);
            });
            expect(setBoardListMock).toHaveBeenCalledTimes(1);

            const sUpdateBoardList = setBoardListMock.mock.calls[0][0] as (
                aBoards: PersistedTazBoardInfo[],
            ) => PersistedTazBoardInfo[];
            const sResult = sUpdateBoardList([createTagAnalyzerBoardSourceInfoFixture(undefined)]);

            expect(sResult[0].panels[0]).toEqual(
                expect.objectContaining({
                    data: expect.objectContaining({
                        seriesList: expect.any(Array),
                    }),
                    toolbar: expect.objectContaining({
                        isRaw: true,
                    }),
                    time: expect.objectContaining({
                        rangeConfig: expect.any(Object),
                    }),
                }),
            );
            const sSavedPanel = sResult[0].panels[0] as { time: Record<string, unknown> };
            expect(sSavedPanel.time).not.toHaveProperty('savedTimeRange');
            expect(sSavedPanel.time).not.toHaveProperty('useSavedTimeRange');
        } finally {
            jest.useRealTimers();
        }
    });

    it('keeps boundary state referentially stable when a refresh returns the same values', async () => {
        // Confirms identical top-level boundary responses no longer churn board state and downstream resets.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });

        const sInitialTimeBoundaryRanges = sLatestBoardProps?.pPanelBoardState.timeBoundaryRanges;
        expect(sInitialTimeBoundaryRanges).toEqual({
            start: { min: 10, max: 10 },
            end: { min: 20, max: 20 },
        });

        resolveTimeBoundaryRangesMock.mockResolvedValueOnce({
            start: { min: 10, max: 10 },
            end: { min: 20, max: 20 },
        } as never);

        await act(async () => {
            await sLatestToolbarProps?.pActionHandlers.onRefreshTime();
        });

        expect(sLatestBoardProps?.pPanelBoardState.timeBoundaryRanges).toBe(
            sInitialTimeBoundaryRanges,
        );
    });

    it('persists a saved panel update immediately through the board-list updater', async () => {
        // Confirms direct panel saves, such as new highlights, replace the stored panel payload right away.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });
        setBoardListMock.mockClear();

        sLatestBoardProps!.pPanelBoardActions.onSavePanel(
            createTagAnalyzerPanelInfoFixture({
                highlights: [
                    {
                        text: 'unnamed',
                        timeRange: {
                            startTime: 123,
                            endTime: 456,
                        },
                    },
                ],
            }),
        );

        expect(setBoardListMock).toHaveBeenCalledWith(expect.any(Function));

        const sUpdateBoardList = setBoardListMock.mock.calls.at(-1)?.[0] as (
            aBoards: PersistedTazBoardInfo[],
        ) => PersistedTazBoardInfo[];
        const sResult = sUpdateBoardList([createTagAnalyzerBoardSourceInfoFixture(undefined)]);
        const sSavedPanel = sResult[0].panels[0] as {
            highlights: Array<{
                text: string;
                timeRange: {
                    startTime: number;
                    endTime: number;
                };
            }>;
        };

        expect(sSavedPanel.highlights).toEqual([
            {
                text: 'unnamed',
                timeRange: {
                    startTime: 123,
                    endTime: 456,
                },
            },
        ]);
    });
});
