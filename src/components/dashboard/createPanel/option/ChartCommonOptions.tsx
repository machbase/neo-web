import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartThemeList } from '@/utils/constants';

export const ChartCommonOptions = ({ pPanelOption, pHandleOption }: any) => {
    return (
        <div className="panel-name-form">
            <div className="panel-name-wrap">Title</div>
            <Input
                pType="text"
                pIsFullWidth
                pHeight={30}
                pValue={pPanelOption.name}
                pSetValue={() => null}
                pBorderRadius={4}
                onChange={(aEvent: any) => pHandleOption(aEvent, 'name')}
            />
            <div style={{ height: '10px' }} />
            <div className="panel-name-wrap">Theme</div>
            <Select
                pFontSize={14}
                pIsFullWidth
                pBorderRadius={4}
                pInitValue={pPanelOption.theme}
                pHeight={30}
                onChange={(aEvent: any) => pHandleOption(aEvent, 'theme')}
                pOptions={ChartThemeList}
            />
        </div>
    );
};
