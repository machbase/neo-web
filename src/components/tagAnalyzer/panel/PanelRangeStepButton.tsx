import type { ComponentProps } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';

type PanelRangeStepButtonProps = {
    direction: 'left' | 'right';
    iconSize: number;
    onClick: ComponentProps<typeof Button>['onClick'];
    size: ComponentProps<typeof Button>['size'];
    toolTipContent: string;
    variant: ComponentProps<typeof Button>['variant'];
};

export function PanelRangeStepButton({
    direction,
    iconSize,
    onClick,
    size,
    toolTipContent,
    variant,
}: PanelRangeStepButtonProps) {
    const IconComponent = direction === 'left' ? VscChevronLeft : VscChevronRight;

    return (
        <Button
            size={size}
            variant={variant}
            isToolTip
            toolTipContent={toolTipContent}
            icon={<IconComponent size={iconSize} />}
            onClick={onClick}
        />
    );
}
