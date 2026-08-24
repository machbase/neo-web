import { VscRecord } from '../../assets/icons/Icon';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString } from '../../utils';
const PanelHeader = ({ pPanelInfo, pIsHeader, pResolvedTheme }: any) => {
    const sHeaderId = generateRandomString();
    
    return (
        <div
            className={`board-panel-header${!pIsHeader ? ' display-none' : ''}${(pResolvedTheme ?? pPanelInfo.theme) !== 'dark' ? ' panel-theme-white' : ''}`}
        >
            <div className="panel-title">
                {pPanelInfo?.title || 'Chart'}
            </div>
            <div className="panel-header-navigator">
                {/* Mirrors the editor's header dot: a distance panel's own window is numeric and lives
                    in its own field, so an overridden distance panel must not print an empty timeRange. */}
                <a
                    data-tooltip-place="bottom"
                    className={`panel-header-time-range${!pPanelInfo.useCustomTime && !pPanelInfo.useCustomDistance ? ' display-none' : ''}`}
                    id={sHeaderId}
                >
                    <VscRecord color="#339900" />
                    <Tooltip
                        className="tooltip"
                        anchorSelect={'#' + sHeaderId}
                        content={
                            pPanelInfo.useCustomDistance
                                ? `${pPanelInfo.distanceRange?.start ?? ''} ~ ${pPanelInfo.distanceRange?.end ?? ''} , ${pPanelInfo.timeRange?.refresh}`
                                : `${pPanelInfo.timeRange?.start} ~ ${pPanelInfo.timeRange?.end} , ${pPanelInfo.timeRange?.refresh}`
                        }
                    />
                </a>
            </div>
        </div>
    );
};

export default PanelHeader;