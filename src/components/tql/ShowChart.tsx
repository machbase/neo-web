import { useEffect } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowChartProps {
    pData: any;
    pIsCenter?: boolean;
}

export const ShowChart = (props: ShowChartProps) => {
    const { pData, pIsCenter } = props;
    const sTheme = pData.theme ? pData.theme : 'dark';

    const LoadScript = async () => {
        pData &&
            (await loadScriptsSequentially({
                jsAssets: pData.jsAssets ? (ExistCommonScript(pData.jsAssets) as string[]) : [],
                jsCodeAssets: pData.jsCodeAssets ? pData.jsCodeAssets : [],
            }));
    };

    useEffect(() => {
        if (pData) LoadScript();
    }, [pData]);

    return (
        <div className="tql-form">
            {pData && pData.cssAssets && <link rel="stylesheet" href={pData.cssAssets[0]} />}
            {pData && pData.style && (
                <div className="chart_container">
                    <div
                        className="chart_item"
                        id={pData.chartID}
                        style={{ backgroundColor: sTheme === 'dark' ? '' : '#FFF', width: pData.style.width, height: pData.style.height, margin: pIsCenter ? 'auto' : 'initial' }}
                    />
                </div>
            )}
        </div>
    );
};
