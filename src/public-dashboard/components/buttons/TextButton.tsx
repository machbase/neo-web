import { Loader } from '../loader';
import './TextButton.scss';

export interface TextButtonProps {
    pText: string;
    pBackgroundColor: string;
    pWidth?: number;
    pHeight?: number;
    pIsDisabled?: boolean;
    pFontColor?: string;
    pBorderColor?: string;
    pBorderRadius?: number;
    pIsLoad?: boolean;
    onClick: React.MouseEventHandler<HTMLDivElement>;
}

export const TextButton = (props: TextButtonProps) => {
    const {
        onClick,
        pIsLoad = false,
        pWidth = 120,
        pBorderColor = '#f8f8f8',
        pBorderRadius = 8,
        pFontColor = '#f8f8f8',
        pHeight = 40,
        pText,
        pBackgroundColor,
        pIsDisabled = false,
    } = props;

    return (
        <div
            className="text-btn-wrapper"
            style={{
                width: pWidth + 'px',
                minWidth: pWidth + 'px',
                height: pHeight + 'px',
                backgroundColor: pBackgroundColor,
                opacity: pIsDisabled ? '0.6' : '1',
                color: pFontColor,
                cursor: pIsDisabled ? 'unset' : 'pointer',
                borderColor: pBorderColor,
                borderRadius: pBorderRadius + 'px',
            }}
            onClick={!pIsDisabled ? onClick : () => null}
        >
            {!pIsLoad ? <span>{pText}</span> : <Loader width="20px" height="20px" />}
        </div>
    );
};
