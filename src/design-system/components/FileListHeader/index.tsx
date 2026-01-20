import React from 'react';
import styles from './index.module.scss';

export interface FileListHeaderProps {
    columns?: string[];
    className?: string;
    style?: React.CSSProperties;
}

const FileListHeader = React.forwardRef<HTMLDivElement, FileListHeaderProps>(
    ({ columns = ['Name', 'Last modified', 'Size'], className, style }, ref) => {
        return (
            <div ref={ref} className={`${styles['file-list-header']} ${className ?? ''}`} style={style}>
                {columns.map((column, index) => (
                    <span key={index} className={styles['file-list-header__column']}>
                        {column}
                    </span>
                ))}
            </div>
        );
    }
);

FileListHeader.displayName = 'FileListHeader';

export default FileListHeader;
