import './IconButton.scss';
import { Tooltip, PlacesType } from 'react-tooltip';

export interface IconButtonProps {
    pIcon: React.ReactNode;
    onClick: React.MouseEventHandler<HTMLDivElement>;
    pIsActive?: boolean;
    pIsActiveHover?: boolean;
    pWidth?: number | string;
    pHeight?: number;
    pDisabled?: boolean;
    pIsToopTip?: boolean;
    pToolTipContent?: string;
    pToolTipId?: string;
    pToolTipMaxWidth?: number;
    pPlace?: PlacesType | undefined;
}

export const IconButton = (props: IconButtonProps) => {
    const {
        pToolTipMaxWidth,
        pIcon,
        pIsActive = false,
        pPlace,
        onClick,
        pWidth = 30,
        pHeight = 30,
        pDisabled = false,
        pIsActiveHover = false,
        pIsToopTip,
        pToolTipContent,
        pToolTipId,
    } = props;
    const sDisabledClass = pDisabled ? 'icon-btn-disabled' : '';
    const sIsActiveHoverClass = pIsActiveHover ? 'icon-btn-active-hover' : '';

    // sql-result-wrapper
    return (
        <div
            className={`${sDisabledClass} ${sIsActiveHoverClass} icon-btn-wrapper`}
            style={{
                width: Number(pWidth) ? pWidth + 'px' : pWidth,
                minWidth: Number(pWidth) ? pWidth + 'px' : pWidth,
                height: pHeight + 'px',
                backgroundColor: pIsActive ? '#52535A' : '',
            }}
            onClick={!pDisabled ? onClick : () => null}
        >
            {pIsToopTip ? (
                <>
                    <div className={`tooltip-${pToolTipId} tooltip-icon`} style={{ display: 'flex' }}>
                        {pIcon}
                    </div>
                    <Tooltip
                        className="tooltip-div"
                        place={pPlace ?? 'top-end'}
                        positionStrategy="absolute"
                        anchorSelect={`.tooltip-${pToolTipId}`}
                        content={pToolTipContent}
                        style={{ width: pToolTipMaxWidth && pToolTipMaxWidth < 500 ? pToolTipMaxWidth + 'px' : '' }}
                        delayShow={700}
                    />
                </>
            ) : (
                pIcon
            )}
        </div>
    );
};
