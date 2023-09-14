import { IconButton } from '@/components/buttons/IconButton';
import { Select } from '@/components/inputs/Select';
import './CreatePanelFotter.scss';
import { Refresh } from '@/assets/icons/Icon';
import Series from './Series';

const CreatePanelFotter = ({ pTableList, pGetTables, pSetChangedChartOption, pChangedChartOption }: any) => {
    return (
        <div className="chart-footer">
            <div className="body">
                <Series pTableList={pTableList} pGetTables={pGetTables}></Series>
            </div>
        </div>
    );
};
export default CreatePanelFotter;
