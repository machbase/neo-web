import LineChart from './LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
const Panel = ({ pType, pPanelInfo }: any) => {
    return (
        <div className="panel-wrap">
            <PanelHeader pType={pType} pPanelInfo={pPanelInfo}></PanelHeader>
        </div>
    );
};
export default Panel;
