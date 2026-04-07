import { act, renderHook, waitFor } from '@testing-library/react';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
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

const fetchTableNameMock = jest.mocked(fetchTableName);
const getTagPaginationMock = jest.mocked(getTagPagination);
const getTagTotalMock = jest.mocked(getTagTotal);
const toastErrorMock = jest.mocked(Toast.error);
const useDebounceMock = jest.mocked(useDebounce);
const getIdMock = jest.mocked(getId);

describe('useTagSearchModalState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useDebounceMock.mockImplementation(() => undefined);
        getIdMock.mockReturnValue('generated-tag-id');
    });

    const createHook = () =>
        renderHook(() =>
            useTagSearchModalState({
                tables: ['TABLE_A', 'TABLE_B'],
                initialTable: 'TABLE_A',
                maxSelectedCount: 12,
                isSameSelectedTag: (aItem, bItem) => aItem.key === bItem.key,
            }),
        );

    it('loads tag rows and columns from the shared search path', async () => {
        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [
                    ['name_col'],
                    ['time_col'],
                    ['value_col'],
                ],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[42]],
            },
        });
        getTagPaginationMock.mockResolvedValue({
            success: true,
            data: {
                rows: [
                    ['tag_a', 'Tag A'],
                    ['tag_b', 'Tag B'],
                ],
            },
        });

        const { result } = createHook();

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

        expect(result.current.tagList).toEqual([
            ['tag_a', 'Tag A'],
            ['tag_b', 'Tag B'],
        ]);
        expect(result.current.tagTotal).toBe(42);
        expect(result.current.columns).toEqual({
            name: 'name_col',
            time: 'time_col',
            value: 'value_col',
        });
        expect(result.current.tagInputValue).toBe('needle');
        expect(result.current.searchText).toBe('needle');
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('resets state and selected table together', () => {
        const { result } = createHook();

        act(() => {
            result.current.setTagPagination(3);
            result.current.setKeepPageNum(3);
            result.current.setSelectedTags([
                {
                    key: 'selected-1',
                    table: 'TABLE_A',
                    tagName: 'tag',
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1,
                    colName: { name: 'n', time: 't', value: 'v' },
                },
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
        expect(result.current.selectedTags).toEqual([]);
        expect(result.current.tagInputValue).toBe('');
        expect(result.current.searchText).toBe('');
        expect(result.current.tagTotal).toBe(0);
        expect(result.current.skipTagTotal).toBe(false);
        expect(result.current.columns).toBeUndefined();
        expect(result.current.tagList).toEqual([]);
    });

    it('adds a tag after loading table columns and updates aggregation mode', async () => {
        fetchTableNameMock.mockResolvedValue({
            success: true,
            data: {
                rows: [
                    ['name_col'],
                    ['time_col'],
                    ['value_col'],
                ],
            },
        });
        getTagTotalMock.mockResolvedValue({
            data: {
                rows: [[12]],
            },
        });
        getTagPaginationMock.mockResolvedValue({
            success: true,
            data: {
                rows: [],
            },
        });

        const { result } = createHook();

        await act(async () => {
            await result.current.loadTagList();
        });

        await waitFor(() => {
            expect(result.current.columns).toEqual({
                name: 'name_col',
                time: 'time_col',
                value: 'value_col',
            });
        });

        await act(async () => {
            const added = await result.current.addTag('tag-name');
            expect(added).toBe(true);
        });

        expect(fetchTableNameMock).toHaveBeenCalledTimes(1);
        expect(result.current.columns).toEqual({
            name: 'name_col',
            time: 'time_col',
            value: 'value_col',
        });
        expect(result.current.selectedTags).toHaveLength(1);
        expect(result.current.selectedTags[0]).toMatchObject({
            key: 'generated-tag-id',
            table: 'TABLE_A',
            tagName: 'tag-name',
            calculationMode: 'avg',
            alias: '',
            weight: 1,
            colName: {
                name: 'name_col',
                time: 'time_col',
                value: 'value_col',
            },
        });

        act(() => {
            result.current.setTagMode('sum', result.current.selectedTags[0]);
        });

        expect(result.current.selectedTags[0].calculationMode).toBe('sum');
    });

    it('updates the selected table and clears search-related state', () => {
        const { result } = createHook();

        act(() => {
            result.current.setTagInputValue('value');
            result.current.setSearchText('value');
            result.current.setTagPagination(4);
            result.current.setKeepPageNum(4);
            result.current.setSelectedTable('TABLE_B');
        });

        expect(result.current.selectedTable).toBe('TABLE_B');
        expect(result.current.tagInputValue).toBe('');
        expect(result.current.searchText).toBe('');
        expect(result.current.tagPagination).toBe(1);
        expect(result.current.keepPageNum).toBe(1);
    });
});
