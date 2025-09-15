import { VscRecord } from '../../assets/icons/Icon';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString } from '../../utils';

const PanelHeader = ({ pPanelInfo, pIsHeader }: any) => {
    const sHeaderId = generateRandomString();
    
    return (
        <div
            className={`board-panel-header${!pIsHeader ? ' display-none' : ''}${pPanelInfo.theme !== 'dark' ? ' panel-theme-white' : ''}`}
        >
            <div className="panel-title">
                {pPanelInfo?.title || 'Chart'}
            </div>
            <div className="panel-header-navigator">
                <a data-tooltip-place="bottom" className={`panel-header-time-range${!pPanelInfo.useCustomTime ? ' display-none' : ''}`} id={sHeaderId}>
                    <VscRecord color="#339900" />
                    <Tooltip
                        className="tooltip"
                        anchorSelect={'#' + sHeaderId}
                        content={`${pPanelInfo.timeRange?.start} ~ ${pPanelInfo.timeRange?.end} , ${pPanelInfo.timeRange?.refresh}`}
                    />
                </a>
            </div>
        </div>
    );
};

export default PanelHeader;