import './BlackboxPanel.scss';

interface BlackboxPanelProps {
    pPanelInfo: any;
    pBoardInfo: any;
    pParentWidth: number;
    pIsHeader: boolean;
}

const BlackboxPanel = ({ pPanelInfo, pBoardInfo: _pBoardInfo, pParentWidth: _pParentWidth, pIsHeader: _pIsHeader }: BlackboxPanelProps) => {
    return (
        <div className="blackbox-panel">
            <div className="blackbox-panel-content">
                <div className="blackbox-panel-placeholder">
                    <span className="blackbox-icon">📦</span>
                    <span className="blackbox-title">{pPanelInfo.title || 'Blackbox Panel'}</span>
                    <span className="blackbox-description">Independent panel - Configure in settings</span>
                </div>
            </div>
        </div>
    );
};

export default BlackboxPanel;
