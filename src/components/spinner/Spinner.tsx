import './Spinner.scss';

interface SpinnerProps {
    pSpeed?: string;
    pColor?: string;
}

export const Spinner = (props: SpinnerProps) => {
    const { pSpeed = '1s', pColor = 'var(--neo-text-tertiary, #a3a3a3)' } = props;
    return (
        <div className="spinner-wrapper">
            <div className="spinner" style={{ backgroundColor: pColor, animationDuration: pSpeed }}></div>
        </div>
    );
};
