import { gSelectedExtension } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import './ExtensionBtn.scss';

interface ExtensionBtnProps {
    pLabel?: string;
    pIcon: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const ExtensionBtn = ({ pLabel, pIcon, onClick }: ExtensionBtnProps) => {
    const [sSelectedExtension] = useRecoilState<string>(gSelectedExtension);
    return (
        <div style={pLabel === sSelectedExtension ? { color: '#f8f8f8' } : { color: '#7c7c7c' }} className="icon" onClick={onClick}>
            {pIcon}
        </div>
    );
};
export default ExtensionBtn;
