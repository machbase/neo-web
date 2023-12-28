import React, { useState } from 'react';
import './Collapse.scss';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';

interface CollapseProps {
    title: string;
    children: React.ReactNode;
}
export const Collapse = (props: CollapseProps) => {
    const { title, children } = props;
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

    const handleOpen = () => {
        setIsOpen(!sIsOpen);
    };

    return (
        <div className="collapse">
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
