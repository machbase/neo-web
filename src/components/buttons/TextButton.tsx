import './TextButton.scss';

export interface TextButtonProps {
    pText: string;
    pWidth: number;
    pHeight: number;
    pBackgroundColor: string;
    pIsDisabled: boolean;
    pFontColor: string;
    pBorderColor: string;
    pBorderRadius: number;
    onClick: React.MouseEventHandler<HTMLDivElement>;
}

export const TextButton = (props: TextButtonProps) => {
    const { onClick, pWidth, pBorderColor, pBorderRadius, pFontColor, pHeight, pText, pBackgroundColor, pIsDisabled } = props;

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
                borderColor: pBorderColor,
                borderRadius: pBorderRadius + 'px',
            }}
            onClick={!pIsDisabled ? onClick : () => null}
        >
            <span>{pText}</span>
        </div>
    );
};

TextButton.defaultProps = {
    pWidth: 120,
    pBorderColor: '#f8f8f8',
    pBorderRadius: 8,
    pHeight: 40,
    pFontColor: '#f8f8f8',
    pIsDisabled: false,
};
