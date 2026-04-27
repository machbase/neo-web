import { useEffect, useState } from 'react';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button, Toast } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import {
    buildTagSelectionLimitError,
    getTagSelectionErrorMessage,
} from '../seriesSelection/tagSelectionPresentation';
import TagSelectionPanel from '../seriesSelection/TagSelectionPanel';
import { useTagSelectionPanelState } from './useTagSelectionPanelState';
import { fetchMinMaxTable } from '../../utils/fetch/TimeBoundaryFetchRepository';
import type { MinMaxTableResponse } from '../../utils/fetch/FetchTypes';
import { buildCreateChartPanel } from '../../utils/series/TagSelectionPanelSeriesBuilder';
import type { PanelEChartType } from '../../utils/panelModelTypes';
import { CREATE_CHART_MAX_SELECTED_COUNT } from '../../boardModal/BoardModalConstants';
import type {
    CreateChartModalProps,
    MinMaxBounds,
} from '../../boardModal/BoardModalTypes';

/**
 * Extracts the min and max nanosecond bounds from the min-max response.
 * Intent: Keep chart seed creation separate from the raw repository response shape.
 * @param {MinMaxTableResponse} response The repository response to inspect.
 * @returns {{ minNanos: number; maxNanos: number } | undefined}
 */
function getMinMaxBounds(response: MinMaxTableResponse): MinMaxBounds | undefined {
    const sRow = response.data?.rows?.[0];
    const sMinNanos = sRow?.[0];
    const sMaxNanos = sRow?.[1];

    if (typeof sMinNanos !== 'number' || typeof sMaxNanos !== 'number') {
        return undefined;
    }

    return {
        minNanos: sMinNanos,
        maxNanos: sMaxNanos,
    };
}

/**
 * Collects table, tag, and chart-type choices for creating a new panel.
 * Intent: Let the user seed a new chart from selected tags and a chosen chart style.
 * @param {boolean} isOpen Whether the modal is open.
 * @param {() => void} onClose Closes the modal.
 * @returns {JSX.Element}
 */
function CreateChartModal({
    isOpen, onClose, pOnAppendPanel, pTables,
}: CreateChartModalProps) {
    const [sSelectedChartType, setSelectedChartType] = useState<PanelEChartType>('Line');
    const { tagSearch: sTagSearch, viewModel: tagSelectionPanelViewModel } =
        useTagSelectionPanelState({
        tables: pTables,
        initialTable: pTables?.[0] || '',
        maxSelectedCount: CREATE_CHART_MAX_SELECTED_COUNT,
        isSameSelectedTag: (item, bItem) => item.key === bItem.key,
        modeTriggerStyle: undefined,
        onSelectionLimitReached: () =>
            Toast.error(
                buildTagSelectionLimitError(CREATE_CHART_MAX_SELECTED_COUNT),
                undefined,
            ),
    });
    const { resetState } = sTagSearch;

    useEffect(() => {
        if (isOpen) {
            resetState(pTables?.[0] || '');
            setSelectedChartType('Line');
        }
    }, [isOpen, pTables, resetState]);

    /**
     * Creates the chart seed and appends it to the current board.
     * Intent: Validate the selection, fetch bounds, and commit the new chart in one place.
     * @returns {Promise<void>}
     */
    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            CREATE_CHART_MAX_SELECTED_COUNT
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        const sBoundarySeries = sTagSearch.selectedSeriesDrafts.map((seriesDraft) => ({
            table: seriesDraft.table,
            sourceTagName: seriesDraft.sourceTagName,
            sourceColumns: seriesDraft.sourceColumns,
        }));
        const sMinMaxBounds = getMinMaxBounds(
            await fetchMinMaxTable(sBoundarySeries)
        );
        if (!sMinMaxBounds) {
            Toast.error('Please insert Data.', undefined);
            return;
        }

        const minMillis = Math.floor(sMinMaxBounds.minNanos / 1000000);
        const maxMillis = Math.floor(sMinMaxBounds.maxNanos / 1000000);
        const sNewPanel = buildCreateChartPanel(
            sSelectedChartType,
            sTagSearch.selectedSeriesDrafts,
            minMillis,
            maxMillis
        );
        pOnAppendPanel(sNewPanel);
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
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
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
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
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
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                </Button.Group>

                <TagSelectionPanel
                    viewModel={tagSelectionPanelViewModel}
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
}

export default CreateChartModal;
