import { useState } from 'react';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import { CreateNewPanelSeriesEditor } from './CreateNewPanelSeriesEditor';
import styles from './CreateNewPanel.module.scss';

function EditSeriesModal({
    rollupTableList,
    onClose,
    initialSeries,
    onUpdateSeries,
}: {
    rollupTableList: RollupTableMap;
    onClose: () => void;
    initialSeries: PanelSeriesDefinition[];
    onUpdateSeries: (tagSet: PanelSeriesDefinition[]) => void;
}) {
    const [sSelectedTags, setSelectedTags] = useState<PanelSeriesDefinition[]>(
        () => [...initialSeries],
    );

    function applySeriesSelection(): void {
        onUpdateSeries(sSelectedTags);
        onClose();
    }

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            style={{ maxWidth: '700px', width: '100%' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <span className={styles.titleIcon}>
                        <BiSolidChart />
                    </span>
                    Edit Series
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div className={styles.panelStack}>
                    <CreateNewPanelSeriesEditor
                        seriesList={sSelectedTags}
                        rollupTableList={rollupTableList}
                        onSeriesListChange={setSelectedTags}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>Cancel</Modal.Cancel>
                <Modal.Confirm onClick={applySeriesSelection}>Apply</Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}

export default EditSeriesModal;
