import { useState } from 'react';
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
import { fetchMinMaxTable } from '../../fetch/TimeBoundaryRangeFetcher';
import { buildCreateChartPanel } from './CreateChartPanelBuilder';
import type { PanelEChartType } from '../../domain/PanelDomain';
import { getMixedXAxisValueKindWarning } from '../../domain/SeriesDomain';
import type { PersistedTazPanelInfo } from '../../persistence/TazPersistenceTypesV200';

const CREATE_CHART_MAX_SELECTED_COUNT = 12;
function CreateChartModal({
    onClose,
    pOnAppendPanel,
    pAvailableSourceTableNames,
}: {
    onClose: () => void;
    pOnAppendPanel: (panel: PersistedTazPanelInfo) => void;
    pAvailableSourceTableNames: string[];
}) {
    const [sSelectedChartType, setSelectedChartType] = useState<PanelEChartType>('Line');
    const { tagSearch: sTagSearch, viewModel: tagSelectionPanelViewModel } =
        useTagSelectionPanelState({
            tables: pAvailableSourceTableNames,
            initialTable: pAvailableSourceTableNames?.[0] || '',
            maxSelectedCount: CREATE_CHART_MAX_SELECTED_COUNT,
            isSameSelectedTag: (item, bItem) => item.key === bItem.key,
            modeTriggerStyle: undefined,
            onSelectionLimitReached: () =>
                Toast.error(
                    buildTagSelectionLimitError(CREATE_CHART_MAX_SELECTED_COUNT),
                    undefined,
                ),
        });
    const validateSelectedSeriesHaveData = async (): Promise<boolean> => {
        const sBoundarySeries = sTagSearch.selectedSeriesDrafts.map((seriesDraft) => ({
            table: seriesDraft.table,
            sourceTagName: seriesDraft.sourceTagName,
            sourceColumns: seriesDraft.sourceColumns,
        }));
        const sFetchedTimeBoundaryRange = await fetchMinMaxTable(sBoundarySeries);
        if (!sFetchedTimeBoundaryRange) {
            Toast.error('Please insert Data.', undefined);
            return false;
        }

        return true;
    };

    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            CREATE_CHART_MAX_SELECTED_COUNT
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        const sAxisKindWarning = getMixedXAxisValueKindWarning(
            sTagSearch.selectedSeriesDrafts,
        );
        if (sAxisKindWarning) {
            Toast.error(sAxisKindWarning, undefined);
            return;
        }

        if (!(await validateSelectedSeriesHaveData())) {
            return;
        }

        const sNewPanel = buildCreateChartPanel(
            sSelectedChartType,
            sTagSearch.selectedSeriesDrafts,
        );
        pOnAppendPanel(sNewPanel);
        onClose();
    };

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            style={{ maxWidth: '600px', width: '100%' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <BiSolidChart />
                    New Chart
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <TagSelectionPanel
                    chartControl={
                        <Button.Group
                            label="Chart"
                            labelPosition="left"
                        >
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={() => setSelectedChartType('Zone')}
                                active={sSelectedChartType === 'Zone'}
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
                            >
                                <img
                                    src={Line}
                                    alt="Line Chart"
                                    style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                            </Button>
                        </Button.Group>
                    }
                    viewModel={tagSelectionPanelViewModel}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm
                    onClick={setPanels}
                >
                    Apply
                </Modal.Confirm>
                <Modal.Cancel>
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}

export default CreateChartModal;
