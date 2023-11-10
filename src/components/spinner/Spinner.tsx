import './Spinner.scss';

interface SpinnerProps {
    pSpeed: string;
    pColor: string;
}

export const Spinner = (props: SpinnerProps) => {
    const { pSpeed, pColor } = props;
    return (
        <div className="spinner-wrapper">
            <div className="spinner" style={{ backgroundColor: pColor, animationDuration: pSpeed }}></div>
        </div>
    );
};

Spinner.defaultProps = {
    pSpeed: '1s',
    pColor: '#c2c2c2',
};
