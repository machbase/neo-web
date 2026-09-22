import type { QuickTimeRangeProps } from '@/design-system/components/QuickTimeRange';
import { Inline, Stack, Text } from './Presentation';
import styles from './QuickTimeRange.module.scss';

export function QuickTimeRange({
    options, onSelect, title = 'Quick Range', className, layout = 'columns',
}: QuickTimeRangeProps & { layout?: 'columns' | 'responsive' }) {
    return (
        <Inline gap={0} align="stretch" className={[styles.root, className].filter(Boolean).join(' ')} data-layout={layout} data-testid="quick-time-range">
            {title && <Text as="div" variant="section" className={styles.title}>{title}</Text>}
            <div className={styles.grid}>
                {options.map((group, index) => (
                    <Stack key={index} gap={0} className={styles.group}>
                        {group.map((option) => (
                            <button key={option.key} data-testid={`preset-${option.value.map(encodeURIComponent).join(':')}`} className={styles.button} type="button" onClick={() => onSelect(option)}>
                                {option.name}
                            </button>
                        ))}
                    </Stack>
                ))}
            </div>
        </Inline>
    );
}
