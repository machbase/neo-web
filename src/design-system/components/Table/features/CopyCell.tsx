import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Button } from '../../Button';
import styles from '../Table.module.scss';

// Unified copy button for all table modes
// Uses Button.Copy (meta table style) with hover opacity transition (SQL style)
export const CopyCell = ({ value }: { value: string }) => {
    const handleCopy = () => {
        ClipboardCopy(value);
    };
    return (
        <div className={styles['copy-cell']}>
            <Button.Copy size="side" variant="ghost" onClick={handleCopy} />
        </div>
    );
};

// Keep backward-compatible exports
export const CopyCellInline = CopyCell;
export const CopyCellButton = CopyCell;
