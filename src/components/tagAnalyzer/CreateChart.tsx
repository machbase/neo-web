import { PlusCircle } from '@/assets/icons/Icon';
import { useState } from 'react';
import './CreateChart.scss';
import ModalCreateChart from './ModalCreateChart';
const CreateChart = () => {
    const [isModal, setIsModal] = useState(false);

    const openModal = () => {
        setIsModal(true);
    };

    const closeModal = () => {
        setIsModal(false);
    };
    return (
        <div>
            <button onClick={openModal} className="tag_plus_wrap">
                <PlusCircle color="#FDB532"></PlusCircle>
            </button>
            {isModal && <div className="backdrop" onClick={closeModal}></div>}
            {isModal && <ModalCreateChart pCloseModal={closeModal} />}
        </div>
    );
};
export default CreateChart;
