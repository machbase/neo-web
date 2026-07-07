import { Badge, List, Pagination } from '@/design-system/components';
import {
    TABLE_INFO_SEARCH_TAG_PAGE_SIZE,
    type TableInfoSearchTagSearchItem,
} from '../../fetch/tableInfoSearch/TableInfoSearchFetch';
import styles from './CreateNewPanel.module.scss';

type CreateNewPanelAvailableSeriesListProps = {
    tags: TableInfoSearchTagSearchItem[];
    total: number;
    page: number;
    pageInputValue: string;
    onPageChange: (page: number) => void;
    onPageInputChange: (value: string) => void;
    onSelectTag: (tagName: string) => void;
};

export function CreateNewPanelAvailableSeriesList({
    tags,
    total,
    page,
    pageInputValue,
    onPageChange,
    onPageInputChange,
    onSelectTag,
}: CreateNewPanelAvailableSeriesListProps) {
    const sTotalPages = Math.max(
        1,
        Math.ceil(total / TABLE_INFO_SEARCH_TAG_PAGE_SIZE),
    );
    const sItems = tags.map((item) => ({
        id: item.id,
        label: item.name,
        tooltip: item.name,
    }));

    return (
        <div className={styles.listColumn}>
            <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>
                    Item list
                    <Badge variant="primary" size="sm">
                        {total}
                    </Badge>
                </span>
            </div>
            <List
                className={`${styles.seriesList} ${styles.availableTagList}`}
                items={sItems}
                onItemClick={(id) => {
                    const sTag = tags.find((tag) => tag.id === String(id));
                    if (sTag) {
                        onSelectTag(sTag.name);
                    }
                }}
            />
            <Pagination
                currentPage={page}
                totalPages={sTotalPages}
                onPageChange={onPageChange}
                onPageInputChange={onPageInputChange}
                inputValue={pageInputValue}
                showTotalPage
                className={styles.seriesPagination}
            />
        </div>
    );
}
