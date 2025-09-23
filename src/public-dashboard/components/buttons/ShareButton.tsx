import './ShareButton.scss';
import { useState } from 'react';
import { IconButton } from './IconButton';
import { Share } from '../../assets/icons/Icon';
import ShareModal from '../modal/ShareModal';

export const ShareButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleShareClick = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="share-button-wrapper">
            <IconButton
                pIsToopTip
                pToolTipContent="Share"
                pToolTipId="share-btn"
                pWidth={20}
                pHeight={20}
                pIcon={<Share />}
                onClick={handleShareClick}
            />
            <ShareModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};
