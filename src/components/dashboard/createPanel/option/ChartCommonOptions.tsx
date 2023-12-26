import { Select } from '@/components/inputs/Select';

export const ChartCommonOptions = ({ pSetPanelOption, pTheme }: any) => {
    const theme = ['dark', 'white', 'vintage', 'macarons', 'infographic', 'shine', 'roma'];

    const HandleTheme = (event: any) => {
        pSetPanelOption((preV: any) => {
            return { ...preV, theme: event.target.value };
        });
    };

    return (
        <div className="panel-name-form">
            <div className="panel-name-wrap">Theme</div>
            <Select pFontSize={14} pWidth={'100%'} pBorderRadius={4} pInitValue={pTheme} pHeight={30} onChange={HandleTheme} pOptions={theme} />
        </div>
    );
};
