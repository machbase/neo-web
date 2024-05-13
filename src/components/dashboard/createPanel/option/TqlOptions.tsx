import { Collapse } from '@/components/collapse/Collapse';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';
import { ChartThemeList } from '@/utils/constants';

interface GaugeOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const TqlOptions = (props: GaugeOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleCustomOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                id: generateUUID(),
                [aKey]: aValue,
            };
        });
    };

    return (
        <div>
            <Collapse title="Panel option" isOpen>
                <div className="menu-style">
                    <span>Theme</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pFontSize={14}
                        pBorderRadius={4}
                        pInitValue={pPanelOption.theme}
                        onChange={(aEvent: any) => handleCustomOption(aEvent.target.value, 'theme')}
                        pOptions={ChartThemeList}
                    />
                </div>
            </Collapse>
        </div>
    );
};
