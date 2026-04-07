import { PlusCircle } from '@/assets/icons/Icon';
import { useState } from 'react';
import CreateChartModal from './modal/CreateChartModal';
import { Button } from '@/design-system/components/Button';

// Renders the add-chart entry button and controls the modal used to create
// a new TagAnalyzer panel from selected tags and chart options.
const TagAnalyzerNewPanelButton = () => {
    const [isModal, setIsModal] = useState(false);

    const openModal = () => {
        setIsModal(true);
    };

    const closeModal = () => {
        setIsModal(false);
    };

    return (
        <>
            <Button variant="secondary" fullWidth shadow icon={<PlusCircle size={16} />} onClick={openModal} style={{ height: '60px' }} />
            <CreateChartModal isOpen={isModal} onClose={closeModal} />
        </>
    );
};

export default TagAnalyzerNewPanelButton;


