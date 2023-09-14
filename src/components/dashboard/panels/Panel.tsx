import LineChart from './LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
const Panel = ({ pDraging, pDraged, pValue, pInsetDraging }: any) => {
    return (
        <div className="panel-wrap">
            <PanelHeader pDraging={pDraging} pValue={pValue}></PanelHeader>

            <LineChart pDraged={pDraged} pValue={pValue} pInsetDraging={pInsetDraging}></LineChart>
        </div>
    );
};
export default Panel;
