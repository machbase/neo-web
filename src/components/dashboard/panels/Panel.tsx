import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
const Panel = ({ pType, pPanelInfo }: any) => {
    return (
        <div className="panel-wrap">
            <PanelHeader pType={pType} pPanelInfo={pPanelInfo}></PanelHeader>
            {pPanelInfo && <LineChart pPanelInfo={pPanelInfo}></LineChart>}
        </div>
    );
};
export default Panel;
