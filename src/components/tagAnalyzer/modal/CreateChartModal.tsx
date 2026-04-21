import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '@/recoil/recoil';
import { DEFAULT_CHART } from '@/utils/constants';
import { convertChartDefault } from '@/utils/utils';
import { getUserName } from '@/utils';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button, Toast } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import {
    getTagSelectionErrorMessage,
    TagSelectionModeRow,
    TagSelectionPanel,
    useTagSelectionState,
} from '../common/tagSelection';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../utils/series/SeriesSummaryUtils';
import {
    fetchMinMaxTable,
    type MinMaxTableResponse,
} from '../utils/time/PanelTimeRangeResolver';
import { buildCreateChartSeed } from '../utils/series/TagSelectionChartSetup';

/**
 * Extracts the min and max nanosecond bounds from the min-max response.
 * Intent: Keep chart seed creation separate from the raw repository response shape.
 * @param {MinMaxTableResponse} aResponse The repository response to inspect.
 * @returns {{ minNanos: number; maxNanos: number } | undefined}
 */
const getMinMaxBounds = (aResponse: MinMaxTableResponse) => {
    const sRow = aResponse.data?.rows?.[0];
    const sMinNanos = sRow?.[0];
    const sMaxNanos = sRow?.[1];

    if (typeof sMinNanos !== 'number' || typeof sMaxNanos !== 'number') {
        return undefined;
    }

    return {
        minNanos: sMinNanos,
        maxNanos: sMaxNanos,
    };
};

/**
 * Collects table, tag, and chart-type choices for creating a new panel.
 * Intent: Let the user seed a new chart from selected tags and a chosen chart style.
 * @param {boolean} isOpen Whether the modal is open.
 * @param {() => void} onClose Closes the modal.
 * @returns {JSX.Element}
 */
const CreateChartModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sTables = useRecoilValue(gTables);
    const [sSelectedChartType, setSelectedChartType] = useState<string>('Line');
    const sMaxSelectedCount = 12;

    const sTagSearch = useTagSelectionState({
        tables: sTables,
        initialTable: sTables?.[0] || '',
        maxSelectedCount: sMaxSelectedCount,
        isSameSelectedTag: (aItem, bItem) => aItem.key === bItem.key,
    });
    const { resetState } = sTagSearch;

    useEffect(() => {
        if (isOpen) {
            resetState(sTables?.[0] || '');
            setSelectedChartType('Line');
        }
    }, [isOpen, sTables, resetState]);

    /**
     * Adds one selected tag to the pending chart seed.
     * Intent: Keep the chart creation flow bounded by the selected tag limit.
     * @param {string} aValue The selected tag identifier.
     * @returns {Promise<void>}
     */
    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            Toast.error(
                `The maximum number of tags in a chart is ${sMaxSelectedCount}.`,
                undefined,
            );
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    /**
     * Creates the chart seed and appends it to the current board.
     * Intent: Validate the selection, fetch bounds, and commit the new chart in one place.
     * @returns {Promise<void>}
     */
    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            sMaxSelectedCount,
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        const sCurrentUserName = getUserName()?.toUpperCase();
        const sMinMaxBounds = getMinMaxBounds(
            await fetchMinMaxTable(
                sTagSearch.selectedSeriesDrafts,
                sCurrentUserName,
            ),
        );
        if (!sMinMaxBounds) {
            Toast.error('Please insert Data.', undefined);
            return;
        }

        const minMillis = Math.floor(sMinMaxBounds.minNanos / 1000000);
        const maxMillis = Math.floor(sMinMaxBounds.maxNanos / 1000000);
        const sNewData = buildCreateChartSeed(
            sSelectedChartType,
            sTagSearch.selectedSeriesDrafts,
            minMillis,
            maxMillis,
        );
        const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab
                    ? { ...aItem, panels: aItem.panels.concat(chartFormat) }
                    : aItem;
            }),
        );
        onClose();
    };

    return (
        <Modal.Root
            isOpen={isOpen}
            onClose={onClose}
            style={{ maxWidth: '600px', width: '100%' }}
            className={undefined}
            size={undefined}
            closeOnEscape={undefined}
            closeOnOutsideClick={undefined}
        >
            <Modal.Header className={undefined} style={undefined}>
                <Modal.Title className={undefined} style={undefined}>
                    <BiSolidChart />
                    New Chart
                </Modal.Title>
                <Modal.Close children={undefined} className={undefined} style={undefined} />
            </Modal.Header>
            <Modal.Body className={undefined} style={undefined}>
                <Button.Group
                    label="Chart"
                    labelPosition="left"
                    className={undefined}
                    style={undefined}
                    fullWidth={undefined}
                >
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setSelectedChartType('Zone')}
                        active={sSelectedChartType === 'Zone'}
                        loading={undefined}
                        icon={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    >
                        <img
                            src={InnerLine}
                            alt="Zone Chart"
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setSelectedChartType('Dot')}
                        active={sSelectedChartType === 'Dot'}
                        loading={undefined}
                        icon={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    >
                        <img
                            src={Scatter}
                            alt="Scatter Chart"
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setSelectedChartType('Line')}
                        active={sSelectedChartType === 'Line'}
                        loading={undefined}
                        icon={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    >
                        <img
                            src={Line}
                            alt="Line Chart"
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }}
                        />
                    </Button>
                </Button.Group>

                <TagSelectionPanel
                    tableOptions={sTagSearch.tableOptions}
                    selectedTable={sTagSearch.selectedTable}
                    onSelectedTableChange={sTagSearch.setSelectedTable}
                    tagTotal={sTagSearch.tagTotal}
                    tagInputValue={sTagSearch.tagInputValue}
                    onTagInputChange={sTagSearch.filterTag}
                    onSearch={sTagSearch.handleSearch}
                    availableTags={sTagSearch.availableTags}
                    onAvailableTagSelect={handleSelectTag}
                    selectedSeriesDrafts={sTagSearch.selectedSeriesDrafts}
                    onSelectedSeriesDraftRemove={sTagSearch.removeSelectedTag}
                    renderSelectedSeriesDraftLabel={(aItem) => (
                        <TagSelectionModeRow
                            selectedSeriesDraft={aItem}
                            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                            onModeChange={(aValue) => sTagSearch.setTagMode(aValue, aItem)}
                            triggerStyle={undefined}
                        />
                    )}
                    maxSelectedCount={sMaxSelectedCount}
                    paginationProp={{
                        maxPageNum: sTagSearch.maxPageNum,
                        tagPagination: sTagSearch.tagPagination,
                        onPageChange: (page) => sTagSearch.setTagPagination(page),
                        keepPageNum: sTagSearch.keepPageNum,
                        onPageInputChange: (value) => sTagSearch.setKeepPageNum(value),
                    }}
                />
            </Modal.Body>
            <Modal.Footer className={undefined} style={undefined}>
                <Modal.Confirm
                    onClick={setPanels}
                    className={undefined}
                    style={undefined}
                    disabled={undefined}
                    loading={undefined}
                    autoFocus={undefined}
                >
                    Apply
                </Modal.Confirm>
                <Modal.Cancel
                    className={undefined}
                    style={undefined}
                    onClick={undefined}
                    autoFocus={undefined}
                >
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default CreateChartModal;
