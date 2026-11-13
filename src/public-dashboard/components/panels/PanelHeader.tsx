import { useHostActions } from '@/components/dashboard/extensions/HostReact';
import { Button, Menu, Page, Toast } from '@/design-system/components';
import { GoGrabber } from '@/assets/icons/Icon';
import { VscRecord } from '../../assets/icons/Icon';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString } from '../../utils';
const PanelHeader = ({ pPanelInfo, pIsHeader, pResolvedTheme, pShowActions = false }: any) => {
    const actions = useHostActions(pPanelInfo?.id);
    const sHeaderId = generateRandomString();
    
    const actionMenu = <Menu.Root>
                    <Menu.Trigger><Button variant="ghost" size="side" aria-label="Panel actions" icon={<GoGrabber size={20} />} /></Menu.Trigger>
                    <Menu.Content>
                        {actions.map(action => <Menu.Item key={action.ownerId + ':' + action.id} icon={action.icon} disabled={action.disabled}
                            rightIcon={action.checked === undefined ? undefined : <Page.Switch pState={action.checked} pCallback={() => {}} />}
                            onClick={() => { try { Promise.resolve(action.onSelect()).catch(() => Toast.error('The extension action failed.')); }
                                catch { Toast.error('The extension action failed.'); } }}>{action.label}</Menu.Item>)}
                    </Menu.Content>
                </Menu.Root>;
    return (
        <>
        {pShowActions && !pIsHeader && actions.length > 0 && <div className="public-extension-actions">{actionMenu}</div>}
        <div
            className={`board-panel-header${!pIsHeader ? ' display-none' : ''}${(pResolvedTheme ?? pPanelInfo.theme) !== 'dark' ? ' panel-theme-white' : ''}`}
        >
            <div className="panel-title">
                {pPanelInfo?.title || 'Chart'}
            </div>
            <div className="panel-header-navigator">
                {pShowActions && pIsHeader && actions.length > 0 && actionMenu}
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
        </>
    );
};

export default PanelHeader;