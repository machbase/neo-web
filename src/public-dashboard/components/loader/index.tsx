import './index.scss';

export const Loader = ({ width, height, borderRadius = '50%' }: { width: string; height: string; borderRadius?: string }) => {
    return <div className="loader" style={{ width, height, borderRadius }} />;
};
