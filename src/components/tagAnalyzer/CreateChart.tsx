import { PlusCircle } from '@/assets/icons/Icon';
import { useState } from 'react';
import ModalCreateChart from './ModalCreateChart';
import { Button } from '@/design-system/components/Button';

const CreateChart = () => {
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
            <ModalCreateChart isOpen={isModal} onClose={closeModal} />
        </>
    );
};

export default CreateChart;
