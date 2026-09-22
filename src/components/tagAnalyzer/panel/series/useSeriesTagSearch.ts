import { useCallback, useState } from 'react';
import { tableMetadataApi } from '../../api/tableMetadataApi';
import { getErrorMessageFromValue } from '../../errorMessage';
import { useLatestAsyncRequest } from '../../hooks/useLatestAsyncRequest';

export function useSeriesTagSearch(
    setFooterMessage: (message: string | undefined) => void,
) {
    const [tags, setTags] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [pageInput, setPageInput] = useState('1');
    const [searchInput, setSearchInput] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [request, setRequest] = useState<TagRequest>();

    const changeSource = useCallback((
        table: string,
        tagColumn: string | undefined,
    ): void => {
        setTags([]);
        setTotal(0);
        setPageInput('1');
        setRequest((current) => table && tagColumn ? {
            table,
            tagColumn,
            searchText: appliedSearch,
            page: 1,
            generation: (current?.generation ?? 0) + 1,
        } : undefined);
    }, [appliedSearch]);

    function loadTags(searchText: string, page: number): void {
        const safePage = Math.max(1, Math.floor(page));
        setPageInput(String(safePage));
        setRequest((current) => current ? {
            ...current,
            searchText,
            page: safePage,
            generation: current.generation + 1,
        } : undefined);
    }

    useLatestAsyncRequest({
        enabled: request !== undefined,
        requestKey: JSON.stringify(request),
        fetch: async () => {
            if (!request) throw new Error('Tag search source is unavailable.');
            return {
                request,
                result: await tableMetadataApi.fetchTags(
                    request.table,
                    request.tagColumn,
                    request.searchText,
                    request.page,
                    TAG_PAGE_SIZE,
                ),
            };
        },
        onSuccess: ({ request, result: { tags, total } }) => {
            const maxPage = Math.max(1, Math.ceil(total / TAG_PAGE_SIZE));
            setTotal(total);
            if (request.page > maxPage) {
                setTags([]);
                loadTags(request.searchText, maxPage);
                return;
            }
            setTags(tags);
            setFooterMessage(undefined);
        },
        onError: (error) => {
            setTags([]);
            setTotal(0);
            setFooterMessage(getErrorMessageFromValue(error));
        },
    });

    function search(): void {
        setFooterMessage(undefined);
        setAppliedSearch(searchInput);
        loadTags(searchInput, 1);
    }

    return {
        tags,
        total,
        page: request?.page ?? 1,
        totalPages: Math.max(1, Math.ceil(total / TAG_PAGE_SIZE)),
        pageInput,
        searchInput,
        hasPendingSearch: searchInput !== appliedSearch,
        setPageInput,
        setSearchInput,
        changeSource,
        search,
        changePage: (page: number) => loadTags(appliedSearch, page),
    };
}

// -------------------- Local --------------------

const TAG_PAGE_SIZE = 10;

type TagRequest = {
    table: string;
    tagColumn: string;
    searchText: string;
    page: number;
    generation: number;
};
