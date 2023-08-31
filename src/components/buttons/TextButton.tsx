import './TextButton.scss';

export interface TextButtonProps {
    pText: string;
    pWidth: number;
    pHeight: number;
    pBackgroundColor: string;
    pIsDisabled: boolean;
    onClick: React.MouseEventHandler<HTMLDivElement>;
}

export const TextButton = (props: TextButtonProps) => {
    const { onClick, pWidth, pHeight, pText, pBackgroundColor, pIsDisabled } = props;

    return (
        <div
            className="text-btn-wrapper"
            style={{
                width: pWidth + 'px',
                minWidth: pWidth + 'px',
                height: pHeight + 'px',
                backgroundColor: pBackgroundColor,
                opacity: pIsDisabled ? '0.6' : '1',
            }}
            onClick={!pIsDisabled ? onClick : () => null}
        >
            <span>{pText}</span>
        </div>
    );
};

TextButton.defaultProps = {
    pWidth: 120,
    pHeight: 40,
    pIsDisabled: false,
};
