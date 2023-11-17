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
        <div className={`icon ${pLabel === sSelectedExtension ? 'selected_extention_icon' : ''}`} onClick={onClick}>
            {pIcon}
        </div>
    );
};
export default ExtensionBtn;
