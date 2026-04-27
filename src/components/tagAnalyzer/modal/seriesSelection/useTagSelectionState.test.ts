import { act, renderHook, waitFor } from '@testing-library/react';
import { Toast } from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    createTagSearchItemsFixture,
    createTagSelectionDraftFixture,
    createTagSelectionSourceColumnsFixture,
    createTagSelectionStateOptionsFixture,
} from '../../TestData/TagSelectionTestData';
import { tagSearchApi } from './TagSelectionSearchRepository';
import { useTagSelectionState } from './useTagSelectionState';

jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
    },
}));

jest.mock('@/hooks/useDebounce', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@/utils', () => {
    const sActual = jest.requireActual('@/utils');
    return {
        ...sActual,
        getId: jest.fn(),
    };
});

const fetchTableNameMock = jest.spyOn(tagSearchApi, 'fetchTableName');
const getTagPaginationMock = jest.spyOn(tagSearchApi, 'getTagPagination');
const getTagTotalMock = jest.spyOn(tagSearchApi, 'getTagTotal');
const toastErrorMock = jest.mocked(Toast.error);
const useDebounceMock = jest.mocked(useDebounce);
const getIdMock = jest.mocked(getId);

function mockSuccessfulSearchResponses({
    columns = createTagSelectionSourceColumnsFixture(),
    total = 0,
    rows = [],
}: {
    columns?: ReturnType<typeof createTagSelectionSourceColumnsFixture>;
    total?: number;
    rows?: Array<[string | number, string]>;
} = {}) {
    fetchTableNameMock.mockResolvedValue({
        success: true,
        data: {
            rows: [[columns.name], [columns.time], [columns.value]],
        },
    });
    getTagTotalMock.mockResolvedValue({
        data: {
            rows: [[total]],
        },
    });
    getTagPaginationMock.mockResolvedValue({
        success: true,
        data: {
            rows: rows,
        },
    });

    return columns;
}

describe('useTagSelectionState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchTableNameMock.mockReset();
        getTagPaginationMock.mockReset();
        getTagTotalMock.mockReset();
        useDebounceMock.mockImplementation(() => undefined);
        getIdMock.mockReturnValue('generated-tag-id');
    });

    it('loads tag rows and columns from the shared search path', async () => {
        const sExpectedTags = createTagSearchItemsFixture();
        const sColumns = mockSuccessfulSearchResponses({
            total: 42,
            rows: sExpectedTags.map((item) => [item.id, item.name]),
        });

        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        act(() => {
            result.current.filterTag('needle');
        });

        await act(async () => {
            await result.current.handleSearch();
        });

        await waitFor(() => {
            expect(fetchTableNameMock).toHaveBeenCalledWith('TABLE_A');
            expect(getTagTotalMock).toHaveBeenCalledWith('TABLE_A', 'needle', 'name_col');
            expect(getTagPaginationMock).toHaveBeenCalledWith('TABLE_A', 'needle', 1, 'name_col');
        });

        expect(result.current.availableTags).toEqual(sExpectedTags);
        expect(result.current.tagTotal).toBe(42);
        expect(result.current.sourceColumns).toEqual(sColumns);
        expect(result.current.tagInputValue).toBe('needle');
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('resets state and selected table together', async () => {
        mockSuccessfulSearchResponses({
            total: 99,
            rows: [['tag-a', 'Tag A']],
        });

        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        await act(async () => {
            result.current.filterTag('search');
            await result.current.loadTagList();
        });

        act(() => {
            result.current.setTagPagination(3);
            result.current.setKeepPageNum(3);
            result.current.setSelectedSeriesDrafts([
                createTagSelectionDraftFixture({
                    key: 'selected-1',
                    sourceTagName: 'tag',
                    sourceColumns: { name: 'n', time: 't', value: 'v' },
                }),
            ]);
            result.current.resetState('TABLE_B');
        });

        expect(result.current.selectedTable).toBe('TABLE_B');
        expect(result.current.tagPagination).toBe(1);
        expect(result.current.keepPageNum).toBe(1);
        expect(result.current.selectedSeriesDrafts).toEqual([]);
        expect(result.current.tagInputValue).toBe('');
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.sourceColumns).toBeUndefined();
        expect(result.current.availableTags).toEqual([]);
    });

    it('adds a tag after loading table columns and updates aggregation mode', async () => {
        const sColumns = mockSuccessfulSearchResponses({
            total: 12,
        });

        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        await act(async () => {
            await result.current.loadTagList();
        });

        await waitFor(() => {
            expect(result.current.sourceColumns).toEqual(sColumns);
        });

        await act(async () => {
            const sWasAdded = await result.current.addTag('tag-name');
            expect(sWasAdded).toBe(true);
        });

        expect(fetchTableNameMock).toHaveBeenCalledTimes(1);
        expect(result.current.sourceColumns).toEqual(sColumns);
        expect(result.current.selectedSeriesDrafts).toHaveLength(1);
        expect(result.current.selectedSeriesDrafts[0]).toMatchObject({
            key: 'generated-tag-id',
            table: 'TABLE_A',
            sourceTagName: 'tag-name',
            calculationMode: 'avg',
            alias: '',
            weight: 1,
            sourceColumns: sColumns,
        });

        act(() => {
            result.current.setTagMode('sum', result.current.selectedSeriesDrafts[0]);
        });

        expect(result.current.selectedSeriesDrafts[0].calculationMode).toBe('sum');
    });

    it('updates the selected table and clears the current search state', async () => {
        mockSuccessfulSearchResponses({
            total: 17,
            rows: [['tag-a', 'Tag A']],
        });

        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        await act(async () => {
            result.current.filterTag('value');
            result.current.setTagPagination(4);
            result.current.setKeepPageNum(4);
            await result.current.loadTagList();
        });

        await waitFor(() => {
            expect(result.current.availableTags).toEqual([
                {
                    id: 'tag-a',
                    name: 'Tag A',
                },
            ]);
        });

        act(() => {
            result.current.setSelectedTable('TABLE_B');
        });

        expect(result.current.selectedTable).toBe('TABLE_B');
        expect(result.current.tagInputValue).toBe('');
        expect(result.current.tagPagination).toBe(1);
        expect(result.current.keepPageNum).toBe(1);
        expect(result.current.availableTags).toEqual([]);
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.sourceColumns).toBeUndefined();
    });

    it('shows an error and resets the visible list when table columns cannot be fetched', async () => {
        fetchTableNameMock.mockResolvedValue({
            success: false,
            message: 'column fetch failed',
        });

        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        await act(async () => {
            await result.current.loadTagList();
        });

        expect(getTagTotalMock).not.toHaveBeenCalled();
        expect(getTagPaginationMock).not.toHaveBeenCalled();
        expect(result.current.availableTags).toEqual([]);
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.sourceColumns).toEqual({
            name: '',
            time: '',
            value: '',
        });
        expect(toastErrorMock).toHaveBeenCalledWith('column fetch failed', undefined);
    });

    it('keeps the fetched columns and total when the pagination call returns an empty failure result', async () => {
        const sColumns = createTagSelectionSourceColumnsFixture();

        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [[sColumns.name], [sColumns.time], [sColumns.value]],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[9]],
            },
        });
        getTagPaginationMock.mockResolvedValue({
            success: false,
            data: {
                rows: [['tag_a', 'Tag A']],
            },
        });

        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        await act(async () => {
            await result.current.loadTagList();
        });

        expect(result.current.sourceColumns).toEqual(sColumns);
        expect(result.current.tagTotal).toBe(9);
        expect(result.current.availableTags).toEqual([]);
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('wires resetState into the debounce dependencies so the hook can reload on reopen', () => {
        const { result } = renderHook(() =>
            useTagSelectionState(createTagSelectionStateOptionsFixture()),
        );

        expect(useDebounceMock).toHaveBeenLastCalledWith(
            [1, 'TABLE_A', 0],
            expect.any(Function),
            200,
            undefined,
        );

        act(() => {
            result.current.resetState('TABLE_B');
        });

        expect(useDebounceMock).toHaveBeenLastCalledWith(
            [1, 'TABLE_B', 1],
            expect.any(Function),
            200,
            undefined,
        );
    });
});
