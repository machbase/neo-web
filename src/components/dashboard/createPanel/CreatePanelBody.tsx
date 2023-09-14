import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pValue, pDraged, pInsetDraging }: any) => {
    return <div className="chart-body">{pValue && <Panel pValue={pValue} pDraged={pDraged} pInsetDraging={pInsetDraging}></Panel>}</div>;
};
export default CreatePanelBody;
