import './IconButton.scss';
import { Tooltip } from 'react-tooltip';

export interface IconButtonProps {
    pIcon: React.ReactNode;
    pIsActive: boolean;
    pIsActiveHover: boolean;
    pWidth: number;
    pHeight: number;
    pDisabled: boolean;
    pIsToopTip?: boolean;
    pToolTipContent?: string;
    pToolTipId?: string;
    onClick: React.MouseEventHandler<HTMLDivElement>;
}

export const IconButton = (props: IconButtonProps) => {
    const { pIcon, pIsActive, onClick, pWidth, pHeight, pDisabled, pIsActiveHover, pIsToopTip, pToolTipContent, pToolTipId } = props;
    const sDisabledClass = pDisabled ? 'icon-btn-disabled' : '';
    const sIsActiveHoverClass = pIsActiveHover ? 'icon-btn-active-hover' : '';

    return (
        <div
            className={`${sDisabledClass} ${sIsActiveHoverClass} icon-btn-wrapper`}
            style={{ width: pWidth + 'px', minWidth: pWidth + 'px', height: pHeight + 'px', backgroundColor: pIsActive ? '#52535A' : '' }}
            onClick={!pDisabled ? onClick : () => null}
        >
            {pIsToopTip ? (
                <>
                    <a className={`tooltip-${pToolTipId}`} style={{ display: 'flex' }}>
                        {pIcon}
                    </a>
                    <Tooltip anchorSelect={`.tooltip-${pToolTipId}`} content={pToolTipContent} />
                </>
            ) : (
                pIcon
            )}
        </div>
    );
};

IconButton.defaultProps = {
    pWidth: 30,
    pHeight: 30,
    pIsActive: false,
    pDisabled: false,
    pIsActiveHover: false,
};
