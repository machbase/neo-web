import React, { useState } from 'react';
import './Collapse.scss';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';

interface CollapseProps {
    title: string;
    children: React.ReactNode;
    isOpen?: boolean;
    isDisable?: boolean;
}
export const Collapse = (props: CollapseProps) => {
    const { title, children, isOpen = false, isDisable = false } = props;
    const [sIsOpen, setIsOpen] = useState<boolean>(isOpen);

    const handleOpen = () => {
        setIsOpen(!sIsOpen);
    };

    return (
        <div className={`collapse${isDisable ? ' collapse-disable' : ''}`}>
            <div className="collapse-header" onClick={handleOpen}>
                <div className="collapse-icon">{sIsOpen ? <VscChevronDown /> : <VscChevronRight />}</div>
                {title}
            </div>
            <div className="collapse-body" style={{ display: sIsOpen ? '' : 'none' }}>
                {children}
            </div>
        </div>
    );
};
