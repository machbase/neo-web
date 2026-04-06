import { FFTModal } from '@/components/modal/FFTModal';
import type { TagAnalyzerMinMaxItem, TagAnalyzerTagItem } from './TagAnalyzerPanelModelTypes';

const PanelFFTModal = ({
    pTagSet,
    pIsOpen,
    pSetIsOpen,
    pMinMaxList,
    pStartTime,
    pEndTime,
}: {
    pTagSet: TagAnalyzerTagItem[];
    pIsOpen: boolean;
    pSetIsOpen: (aValue: boolean | ((aPrev: boolean) => boolean)) => void;
    pMinMaxList: TagAnalyzerMinMaxItem[];
    pStartTime: number;
    pEndTime: number;
}) => {
    if (!pIsOpen) {
        return null;
    }

    return (
        <FFTModal
            pInfo={pMinMaxList}
            setIsOpen={pSetIsOpen}
            pStartTime={pStartTime}
            pEndTime={pEndTime}
            pTagColInfo={pTagSet}
        />
    );
};

export default PanelFFTModal;
