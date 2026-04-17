import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import type { ReactNode } from 'react';
import { useSetRecoilState } from 'recoil';
import { fetchTablesData, getRollupTableList } from '@/api/repository/machiot';
import { parseTables } from '@/utils';
import { gBoardList, gRollupTableList, gTables } from '@/recoil/recoil';
import {
    createTagAnalyzerBoardSourceInfoFixture,
    createTagAnalyzerEditRequestFixture as mockCreateTagAnalyzerEditRequestFixture,
    createTagAnalyzerPanelInfoFixture,
    createOverlapPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from './TestData/PanelTestData';
import type {
    BoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerBoardSourceInfo,
} from './TagAnalyzerTypes';
import { resolveTagAnalyzerBgnEndTimeRange } from './TagAnalyzerUtilCaller';
import TagAnalyzer, { getNextOverlapPanels } from './TagAnalyzer';

// Used by TagAnalyzer tests to type mock board props.
type MockBoardProps = {
    pPanelBoardActions: BoardPanelActions;
    pPanelBoardState: TagAnalyzerBoardPanelState;
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
const fetchTablesDataMock = jest.mocked(fetchTablesData);
const getRollupTableListMock = jest.mocked(getRollupTableList);
const parseTablesMock = jest.mocked(parseTables);
const useSetRecoilStateMock = jest.mocked(useSetRecoilState);
const resolveTagAnalyzerBgnEndTimeRangeMock = jest.mocked(resolveTagAnalyzerBgnEndTimeRange);

let sLatestBoardProps: MockBoardProps | undefined;
let sLatestToolbarProps: MockToolbarProps | undefined;

jest.mock('@/api/repository/machiot', () => ({
    fetchTablesData: jest.fn(),
    getRollupTableList: jest.fn(),
}));

jest.mock('@/utils', () => {
    const sActual = jest.requireActual('@/utils');
    return {
        ...sActual,
        parseTables: jest.fn(),
    };
});

jest.mock('recoil', () => {
    const sActual = jest.requireActual('recoil');
    return {
        ...sActual,
        useSetRecoilState: jest.fn(),
    };
});

jest.mock('./TagAnalyzerUtilCaller', () => ({
    resolveTagAnalyzerBgnEndTimeRange: jest.fn(),
}));

jest.mock('@/design-system/components', () => {
    const Page = ({ children }: { children: ReactNode }) => <div data-testid="page">{children}</div>;
    Page.Body = ({ children }: { children: ReactNode }) => (
        <div data-testid="page-body">{children}</div>
    );
    Page.ContentBlock = ({ children }: { children: ReactNode }) => (
        <div data-testid="page-content">{children}</div>
    );
    const Button = ({
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
    Button.Group = ({ children }: { children: ReactNode }) => <div>{children}</div>;

    return { Button, Page };
});

jest.mock('./TagAnalyzerBoardToolbar', () => {
    return function MockTagAnalyzerBoardToolbar(props: MockToolbarProps) {
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
});

jest.mock('./TagAnalyzerBoard', () => {
    return function MockTagAnalyzerBoard(props: MockBoardProps) {
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
                    onClick={() => props.pPanelBoardActions.onDeletePanel('panel-1')}
                >
                    delete-panel
                </button>
            </div>
        );
    };
});

jest.mock('./modal/CreateChartModal', () => {
    return function MockCreateChartModal() {
        return null;
    };
});

jest.mock('./modal/OverlapModal', () => {
    return function MockOverlapModal() {
        return <div data-testid="overlap-modal" />;
    };
});

jest.mock('../modal/TimeRangeModal', () => {
    return function MockTimeRangeModal({
        pSetTimeRangeModal,
        pSaveCallback,
    }: {
        pSetTimeRangeModal: Dispatch<SetStateAction<boolean>>;
        pSaveCallback: ((aStart: number, aEnd: number) => void) | undefined;
    }) {
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
});

jest.mock('./editor/PanelEditor', () => {
    return function MockPanelEditor({ pSetEditPanel }: { pSetEditPanel: () => void }) {
        return (
            <div data-testid="panel-editor">
                <button type="button" onClick={pSetEditPanel}>
                    close-editor
                </button>
            </div>
        );
    };
});

/**
 * Builds the top-level TagAnalyzer props used by the controller boundary test.
 * @param aOverrides The board-source fields to override for the current fixture.
 * @returns A complete TagAnalyzer prop bundle for the focused boundary tests.
 */
const createProps = (aOverrides: Partial<TagAnalyzerBoardSourceInfo> = {}) => ({
    pInfo: createTagAnalyzerBoardSourceInfoFixture(aOverrides),
    pHandleSaveModalOpen: handleSaveModalOpenMock,
    pSetIsSaveModal: setIsSaveModalMock,
});

describe('TagAnalyzer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sLatestBoardProps = undefined;
        sLatestToolbarProps = undefined;

        useSetRecoilStateMock.mockImplementation((aAtom) => {
            if (aAtom === gTables) return setTablesMock;
            if (aAtom === gRollupTableList) return setRollupTablesMock;
            if (aAtom === gBoardList) return setBoardListMock;
            return jest.fn();
        });

        fetchTablesDataMock.mockResolvedValue({
            success: true,
            data: { rows: [['TABLE_A']] },
        } as never);
        getRollupTableListMock.mockResolvedValue(['ROLLUP_TABLE'] as never);
        parseTablesMock.mockReturnValue(['TABLE_A'] as never);
        resolveTagAnalyzerBgnEndTimeRangeMock.mockResolvedValue({
            bgn: { min: 10, max: 10 },
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
        expect(resolveTagAnalyzerBgnEndTimeRangeMock).toHaveBeenCalledWith(
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
            expect(resolveTagAnalyzerBgnEndTimeRangeMock).toHaveBeenCalledWith(
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
        expect(handleSaveModalOpenMock).toHaveBeenCalledTimes(1);
        expect(setIsSaveModalMock).toHaveBeenCalledWith(true);
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

        fireEvent.click(screen.getByText('delete-panel'));

        expect(setBoardListMock).toHaveBeenCalledWith(expect.any(Function));

        const sUpdateBoardList = setBoardListMock.mock.calls[0][0] as (
            aBoards: TagAnalyzerBoardSourceInfo[],
        ) => TagAnalyzerBoardSourceInfo[];
        const sResult = sUpdateBoardList([createTagAnalyzerBoardSourceInfoFixture(undefined)]);

        expect(sResult[0].panels).toEqual([]);
    });

    it('keeps overlap panel state referentially stable when a changed update does not match any selected panel', () => {
        // Confirms unrelated panel range changes do not force board rerenders through overlap state churn.
        const sOverlapPanels = [createOverlapPanelInfoFixture(undefined)];
        const sNextPanels = getNextOverlapPanels(
            sOverlapPanels,
            300,
            450,
            createTagAnalyzerPanelInfoFixture({
                meta: { index_key: 'panel-2' },
            }),
            false,
            'changed',
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
        jest.useFakeTimers();

        try {
            sLatestBoardProps!.pPanelBoardActions.onPersistPanelState(
                'panel-1',
                {
                    panelRange: createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                    navigatorRange: createTagAnalyzerTimeRangeFixture({
                        startTime: 50,
                        endTime: 250,
                    }),
                },
                false,
            );
            sLatestBoardProps!.pPanelBoardActions.onPersistPanelState(
                'panel-1',
                {
                    panelRange: createTagAnalyzerTimeRangeFixture({ startTime: 300, endTime: 450 }),
                    navigatorRange: createTagAnalyzerTimeRangeFixture({
                        startTime: 250,
                        endTime: 500,
                    }),
                },
                true,
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
                aBoards: TagAnalyzerBoardSourceInfo[],
            ) => TagAnalyzerBoardSourceInfo[];
            const sResult = sUpdateBoardList([createTagAnalyzerBoardSourceInfoFixture(undefined)]);

            expect(sResult[0].panels[0]).toEqual(
                expect.objectContaining({
                    raw_keeper: true,
                    time_keeper: {
                        panelRange: { startTime: 300, endTime: 450 },
                        navigatorRange: { startTime: 250, endTime: 500 },
                    },
                }),
            );
        } finally {
            jest.useRealTimers();
        }
    });
});
