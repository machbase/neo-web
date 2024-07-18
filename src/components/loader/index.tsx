import './index.scss';

export const Loader = ({ width, height }: { width: string; height: string }) => {
    return <div className="loader" style={{ width, height }} />;
};
