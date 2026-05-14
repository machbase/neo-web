import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { gBoardList, gRollupTableList, gSelectedTab, gTables } from '@/recoil/recoil';
import { postFileList } from '@/api/repository/api';
import {
    createTagAnalyzerBoardSourceInfoFixture,
    createTagAnalyzerPanelInfoFixture,
    createOverlapPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from './TestData/PanelTestData';
import type {
    BoardActions,
    BoardState,
    PanelBoardCommands,
    PanelCommandRegistry,
} from './domain/BoardModel';
import type { PersistedTazBoardInfo } from './persistence/TazPersistenceTypesV200';
import type { TimeRangeConfig } from './domain/time/TimeTypes';
import { getNextOverlapPanels } from './boardModal/OverlapComparisonUtils';
import {
    fetchRollupMetadata,
} from './fetch/RollupMetadataFetcher';
import { fetchAvailableSourceTableNames } from './fetch/SourceTableNameFetcher';
import {
    loadTazSaveModalInitialState,
} from './boardModal/TazSaveModal';
import TagAnalyzer from './TagAnalyzer';

const setTablesMock = jest.fn();
const setRollupTablesMock = jest.fn();
const updateBoardListMock = jest.fn();
const fetchAvailableSourceTableNamesMock = jest.mocked(fetchAvailableSourceTableNames);
const fetchRollupMetadataMock = jest.mocked(fetchRollupMetadata);
const postFileListMock = jest.mocked(postFileList);
const useRecoilValueMock = jest.mocked(useRecoilValue);
const useSetRecoilStateMock = jest.mocked(useSetRecoilState);
const loadTazSaveModalInitialStateMock = jest.mocked(loadTazSaveModalInitialState);

let sLatestBoardProps:
    | {
          pPanelBoardActions: BoardActions;
          pPanelBoardState: BoardState;
      }
    | undefined;
let sLatestToolbarProps:
    | {
          pTimeRangeConfig: TimeRangeConfig;
          pActionHandlers: {
              onOpenTimeRangeModal: () => void;
              onRefreshData: () => void;
              onRefreshTime: () => void;
              onSave: () => void;
              onOpenSaveModal: () => void;
              onOpenOverlapModal: () => void;
          };
      }
    | undefined;
let mockPanelCommands: jest.Mocked<PanelBoardCommands>;

jest.mock('./fetch/RollupMetadataFetcher', () => {
    const sActual = jest.requireActual('./fetch/RollupMetadataFetcher');
    return {
        ...sActual,
        fetchRollupMetadata: jest.fn(),
    };
});

jest.mock('./fetch/SourceTableNameFetcher', () => ({
    ...jest.requireActual('./fetch/SourceTableNameFetcher'),
    fetchAvailableSourceTableNames: jest.fn(),
}));

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

jest.mock('@/design-system/components', () => {
    const MockDesignSystemPage = ({ children }: { children: ReactNode }) => (
        <div data-testid="page">{children}</div>
    );
    MockDesignSystemPage.Body = ({ children }: { children: ReactNode }) => (
        <div data-testid="page-body">{children}</div>
    );
    MockDesignSystemPage.ContentBlock = ({ children }: { children: ReactNode }) => (
        <div data-testid="page-content">{children}</div>
    );
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
    const MockTagAnalyzerBoardToolbar = (props: {
        pTimeRangeConfig: TimeRangeConfig;
        pActionHandlers: {
            onOpenTimeRangeModal: () => void;
            onRefreshData: () => void;
            onRefreshTime: () => void;
            onSave: () => void;
            onOpenSaveModal: () => void;
            onOpenOverlapModal: () => void;
        };
    }) => {
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
    const MockTagAnalyzerBoard = (props: {
        pPanelBoardActions: BoardActions;
        pPanelBoardState: BoardState;
        pPanelCommandRegistry: PanelCommandRegistry;
    }) => {
        sLatestBoardProps = props;
        props.pPanelCommandRegistry.registerPanelCommands('panel-1', mockPanelCommands);

        return (
            <div data-testid="tag-board">
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

jest.mock('./modal/selectionPanel/CreateChartModal', () => {
    const MockCreateChartModal = () => {
        return null;
    };

    return MockCreateChartModal;
});

jest.mock('./boardModal/OverlapModal', () => {
    const MockOverlapModal = () => {
        return <div data-testid="overlap-modal" />;
    };

    return MockOverlapModal;
});

jest.mock('./boardModal/TazSaveModal', () => {
    const MockTazSaveModal = () => {
        return <div data-testid="taz-save-modal" />;
    };
    const mockLoadTazSaveModalInitialState = jest.fn(async () => ({
        directorySegments: [],
        fileName: 'board.taz',
        fileList: [],
    }));

    return {
        __esModule: true,
        default: MockTazSaveModal,
        loadTazSaveModalInitialState: mockLoadTazSaveModalInitialState,
    };
});

jest.mock('./boardModal/BoardTimeRangeModal', () => {
    const MockBoardTimeRangeModal = ({
        onApply,
        onClose,
    }: {
        onApply: (timeRange: {
            start: { kind: 'absolute'; timestamp: number };
            end: { kind: 'absolute'; timestamp: number };
        }) => void;
        onClose: () => void;
    }) => {
        return (
            <div data-testid="time-range-modal">
                <button
                    type="button"
                    onClick={() =>
                        onApply({
                            start: { kind: 'absolute', timestamp: 111 },
                            end: { kind: 'absolute', timestamp: 222 },
                        })
                    }
                >
                    save-time-range
                </button>
                <button type="button" onClick={onClose}>
                    close-time-range
                </button>
            </div>
        );
    };

    return MockBoardTimeRangeModal;
});
const createProps = (overrides: Partial<PersistedTazBoardInfo> = {}) => ({
    pInfo: createTagAnalyzerBoardSourceInfoFixture(overrides),
});

describe('TagAnalyzer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestBoardProps = undefined;
        sLatestToolbarProps = undefined;
        mockPanelCommands = {
            refreshData: jest.fn(),
            refreshTime: jest.fn(),
            applyBoardTimeRange: jest.fn(),
            applyGlobalTimeRange: jest.fn(),
        };

        useRecoilValueMock.mockImplementation((atom) => {
            if (atom === gSelectedTab) {
                return 'board-1';
            }

            return undefined;
        });

        useSetRecoilStateMock.mockImplementation((atom) => {
            if (atom === gBoardList) return updateBoardListMock;
            if (atom === gTables) return setTablesMock;
            if (atom === gRollupTableList) return setRollupTablesMock;
            return jest.fn();
        });

        fetchAvailableSourceTableNamesMock.mockResolvedValue(['TABLE_A'] as never);
        fetchRollupMetadataMock.mockResolvedValue(['ROLLUP_TABLE'] as never);
        postFileListMock.mockResolvedValue({ success: true } as never);
        loadTazSaveModalInitialStateMock.mockResolvedValue({
            directorySegments: [],
            fileName: 'board.taz',
            fileList: [],
        });
    });

    it('loads workspace metadata and keeps the top-level toolbar, modals, and editor wiring intact', async () => {
        // Confirms the controller split preserves the visible top-level workflow contracts.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });

        expect(setTablesMock).toHaveBeenCalledWith(['TABLE_A']);
        expect(setRollupTablesMock).toHaveBeenCalledWith(['ROLLUP_TABLE']);

        fireEvent.click(screen.getByText('refresh-data'));
        expect(mockPanelCommands.refreshData).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('open-time-range'));
        expect(screen.getByTestId('time-range-modal')).toBeInTheDocument();

        updateBoardListMock.mockClear();
        fireEvent.click(screen.getByText('save-time-range'));
        expect(updateBoardListMock).toHaveBeenCalledWith(expect.any(Function));
        const sApplyBoardTimeRange = updateBoardListMock.mock.calls.at(-1)?.[0] as (
            boards: PersistedTazBoardInfo[],
        ) => PersistedTazBoardInfo[];
        expect(sApplyBoardTimeRange([createTagAnalyzerBoardSourceInfoFixture(undefined)])[0])
            .toEqual(
                expect.objectContaining({
                    boardTimeRange: {
                        start: { kind: 'absolute', timestamp: 111 },
                        end: { kind: 'absolute', timestamp: 222 },
                    },
                }),
            );
        expect(mockPanelCommands.applyBoardTimeRange).toHaveBeenCalledWith({
            start: { kind: 'absolute', timestamp: 111 },
            end: { kind: 'absolute', timestamp: 222 },
        });

        fireEvent.click(screen.getByText('open-overlap'));
        expect(screen.getByTestId('overlap-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('save'));
        fireEvent.click(screen.getByText('open-save-modal'));
        await waitFor(() => {
            expect(loadTazSaveModalInitialStateMock).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByTestId('taz-save-modal')).toBeInTheDocument();
        expect(sLatestToolbarProps).toEqual(
            expect.objectContaining({
                pTimeRangeConfig: expect.objectContaining({
                    start: expect.any(Object),
                    end: expect.any(Object),
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
        updateBoardListMock.mockClear();

        fireEvent.click(screen.getByText('delete-panel'));

        expect(updateBoardListMock).toHaveBeenCalledWith(expect.any(Function));

        const sUpdateBoardList = updateBoardListMock.mock.calls[0][0] as (
            boards: PersistedTazBoardInfo[],
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
        updateBoardListMock.mockClear();
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

            expect(updateBoardListMock).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(149);
            });
            expect(updateBoardListMock).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(1);
            });
            expect(updateBoardListMock).toHaveBeenCalledTimes(1);

            const sUpdateBoardList = updateBoardListMock.mock.calls[0][0] as (
                boards: PersistedTazBoardInfo[],
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

    it('runs the registered panel refresh-time command without storing top-level boundary state', async () => {
        // Confirms the board calls mounted panel commands while each panel owns its own boundary lookup.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });

        await act(async () => {
            await sLatestToolbarProps?.pActionHandlers.onRefreshTime();
        });

        expect(mockPanelCommands.refreshTime).toHaveBeenCalledTimes(1);
    });

    it('persists a saved panel update immediately through the board-list updater', async () => {
        // Confirms direct panel saves, such as new highlights, replace the stored panel payload right away.
        render(<TagAnalyzer {...createProps(undefined)} />);

        await waitFor(() => {
            expect(screen.getByTestId('tag-board')).toBeInTheDocument();
        });
        updateBoardListMock.mockClear();

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

        expect(updateBoardListMock).toHaveBeenCalledWith(expect.any(Function));

        const sUpdateBoardList = updateBoardListMock.mock.calls.at(-1)?.[0] as (
            boards: PersistedTazBoardInfo[],
        ) => PersistedTazBoardInfo[];
        const sResult = sUpdateBoardList([createTagAnalyzerBoardSourceInfoFixture(undefined)]);
        const sSavedPanel = sResult[0].panels[0] as {
            highlights: Array<{
                text: string;
                timeRange: {
                    startTime: number;
                    endTime: number;
                };
                fillColor: string;
                textColor: string;
            }>;
        };

        expect(sSavedPanel.highlights).toEqual([
            {
                text: 'unnamed',
                timeRange: {
                    startTime: 123,
                    endTime: 456,
                },
                fillColor: '#fdb532',
                textColor: '#fdb532',
            },
        ]);
    });
});

