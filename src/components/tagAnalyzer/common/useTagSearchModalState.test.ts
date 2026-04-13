import { act, renderHook, waitFor } from '@testing-library/react';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    createTagSearchModalStateOptionsFixture,
    createTagSearchResultRowsFixture,
    createTagSearchSourceColumnsFixture,
    createTagSelectionDraftFixture,
} from '../TestData/TagSearchTestData';
import { useTagSearchModalState } from './useTagSearchModalState';

jest.mock('@/api/repository/machiot', () => ({
    fetchTableName: jest.fn(),
    getTagPagination: jest.fn(),
    getTagTotal: jest.fn(),
}));

jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
    },
}));

jest.mock('@/hooks/useDebounce', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@/utils', () => ({
    getId: jest.fn(),
}));

const fetchTableNameMock = fetchTableName as jest.Mock;
const getTagPaginationMock = getTagPagination as jest.Mock;
const getTagTotalMock = getTagTotal as jest.Mock;
const toastErrorMock = jest.mocked(Toast.error);
const useDebounceMock = jest.mocked(useDebounce);
const getIdMock = jest.mocked(getId);

describe('useTagSearchModalState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useDebounceMock.mockImplementation(() => undefined);
        getIdMock.mockReturnValue('generated-tag-id');
    });

    it('loads tag rows and columns from the shared search path', async () => {
        const sColumns = createTagSearchSourceColumnsFixture(undefined);
        const sRows = createTagSearchResultRowsFixture();

        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [[sColumns.name], [sColumns.time], [sColumns.value]],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[42]],

                status: undefined,
                statusText: undefined,
                headers: undefined,
                config: undefined,
            },

            status: undefined,
            statusText: undefined,
            headers: undefined,
            config: undefined,
        });
        getTagPaginationMock.mockResolvedValue({
            success: true,
            data: {
                rows: sRows,
            },
        });

        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        await act(async () => {
            result.current.setTagInputValue('needle');
            result.current.setSearchText('needle');
        });

        await act(async () => {
            await result.current.handleSearch();
        });

        await waitFor(() => {
            expect(fetchTableNameMock).toHaveBeenCalledWith('TABLE_A');
            expect(getTagTotalMock).toHaveBeenCalledWith('TABLE_A', 'needle', 'name_col');
            expect(getTagPaginationMock).toHaveBeenCalledWith('TABLE_A', 'needle', 1, 'name_col');
        });

        expect(result.current.availableTagResults).toEqual(sRows);
        expect(result.current.tagTotal).toBe(42);
        expect(result.current.sourceColumns).toEqual(sColumns);
        expect(result.current.tagInputValue).toBe('needle');
        expect(result.current.searchText).toBe('needle');
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('resets state and selected table together', () => {
        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        act(() => {
            result.current.setTagPagination(3);
            result.current.setKeepPageNum(3);
            result.current.setSelectedSeriesDrafts([
                createTagSelectionDraftFixture({
                    key: 'selected-1',
                    sourceTagName: 'tag',
                    colName: { name: 'n', time: 't', value: 'v' },
                }),
            ]);
            result.current.setTagInputValue('search');
            result.current.setSearchText('search');
            result.current.setTagTotal(99);
            result.current.setSkipTagTotal(true);
            result.current.setColumns({
                name: 'name_col',
                time: 'time_col',
                value: 'value_col',
            });
            result.current.resetState('TABLE_B');
        });

        expect(result.current.selectedTable).toBe('TABLE_B');
        expect(result.current.tagPagination).toBe(1);
        expect(result.current.keepPageNum).toBe(1);
        expect(result.current.selectedSeriesDrafts).toEqual([]);
        expect(result.current.tagInputValue).toBe('');
        expect(result.current.searchText).toBe('');
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.skipTagTotal).toBe(false);
        expect(result.current.sourceColumns).toBeUndefined();
        expect(result.current.availableTagResults).toEqual([]);
    });

    it('adds a tag after loading table columns and updates aggregation mode', async () => {
        const sColumns = createTagSearchSourceColumnsFixture(undefined);

        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [[sColumns.name], [sColumns.time], [sColumns.value]],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[12]],

                status: undefined,
                statusText: undefined,
                headers: undefined,
                config: undefined,
            },

            status: undefined,
            statusText: undefined,
            headers: undefined,
            config: undefined,
        });
        getTagPaginationMock.mockResolvedValue({
            success: true,
            data: {
                rows: [],
            },
        });

        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        await act(async () => {
            await result.current.loadTagList();
        });

        await waitFor(() => {
            expect(result.current.sourceColumns).toEqual(sColumns);
        });

        await act(async () => {
            const added = await result.current.addTag('tag-name');
            expect(added).toBe(true);
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
            colName: sColumns,
        });

        act(() => {
            result.current.setTagMode('sum', result.current.selectedSeriesDrafts[0]);
        });

        expect(result.current.selectedSeriesDrafts[0].calculationMode).toBe('sum');
    });

    it('updates the selected table and clears the current search state', async () => {
        const sColumns = createTagSearchSourceColumnsFixture(undefined);
        const sRows = [createTagSearchResultRowsFixture()[0]];

        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [[sColumns.name], [sColumns.time], [sColumns.value]],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[17]],

                status: undefined,
                statusText: undefined,
                headers: undefined,
                config: undefined,
            },

            status: undefined,
            statusText: undefined,
            headers: undefined,
            config: undefined,
        });
        getTagPaginationMock.mockResolvedValue({
            success: true,
            data: {
                rows: sRows,
            },
        });

        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        await act(async () => {
            result.current.setTagInputValue('value');
            result.current.setSearchText('value');
            result.current.setTagPagination(4);
            result.current.setKeepPageNum(4);
            result.current.setSkipTagTotal(true);
            await result.current.loadTagList();
        });

        await waitFor(() => {
            expect(result.current.availableTagResults).toEqual(sRows);
        });

        act(() => {
            result.current.setSelectedTable('TABLE_B');
        });

        expect(result.current.selectedTable).toBe('TABLE_B');
        expect(result.current.tagInputValue).toBe('');
        expect(result.current.searchText).toBe('');
        expect(result.current.tagPagination).toBe(1);
        expect(result.current.keepPageNum).toBe(1);
        expect(result.current.availableTagResults).toEqual([]);
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.skipTagTotal).toBe(false);
        expect(result.current.sourceColumns).toBeUndefined();
    });

    it('shows an error and resets the visible list when table columns cannot be fetched', async () => {
        fetchTableNameMock.mockResolvedValue({
            success: false,
            message: 'column fetch failed',
        });

        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        await act(async () => {
            await result.current.loadTagList();
        });

        expect(getTagTotalMock).not.toHaveBeenCalled();
        expect(getTagPaginationMock).not.toHaveBeenCalled();
        expect(result.current.availableTagResults).toEqual([]);
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.sourceColumns).toEqual({
            name: '',
            time: '',
            value: '',
        });
        expect(result.current.skipTagTotal).toBe(false);
        expect(toastErrorMock).toHaveBeenCalledWith('column fetch failed');
    });

    it('keeps the fetched columns and total when the pagination call returns an empty failure result', async () => {
        const sColumns = createTagSearchSourceColumnsFixture(undefined);

        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [[sColumns.name], [sColumns.time], [sColumns.value]],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[9]],

                status: undefined,
                statusText: undefined,
                headers: undefined,
                config: undefined,
            },

            status: undefined,
            statusText: undefined,
            headers: undefined,
            config: undefined,
        });
        getTagPaginationMock.mockResolvedValue({
            success: false,
            data: {
                rows: [['tag_a', 'Tag A']],
            },
        });

        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        await act(async () => {
            await result.current.loadTagList();
        });

        expect(result.current.sourceColumns).toEqual(sColumns);
        expect(result.current.tagTotal).toBe(9);
        expect(result.current.availableTagResults).toEqual([]);
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('wires resetState into the debounce dependencies so the hook can reload on reopen', () => {
        const { result } = renderHook(() =>
            useTagSearchModalState(createTagSearchModalStateOptionsFixture()),
        );

        expect(useDebounceMock).toHaveBeenLastCalledWith(
            [1, 'TABLE_A', 0],
            expect.any(Function),
            200,
        );

        act(() => {
            result.current.resetState('TABLE_B');
        });

        expect(useDebounceMock).toHaveBeenLastCalledWith(
            [1, 'TABLE_B', 1],
            expect.any(Function),
            200,
        );
    });
});
