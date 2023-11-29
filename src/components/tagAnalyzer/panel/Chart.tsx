import { formatColors, getTimeZoneValue } from '@/utils/utils';
import Highcharts from 'highcharts/highstock';
import HighchartsBoost from 'highcharts/modules/boost';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useState } from 'react';

HighchartsBoost(Highcharts);

const Chart = ({
    pPanelInfo,
    pIsRaw,
    pChartData,
    pAreaChart,
    pNavigatorData,
    pSetExtremes,
    pSetNavigatorExtremes,
    pPanelRange,
    pNavigatorRange,
    pChartWrap,
    pIsMinMaxPopup,
    pViewMinMaxPopup,
    pIsUpdate,
}: any) => {
    const [options, setOptions] = useState<any>({});

    const getMaxValue = (array: number[][]) => {
        return array.reduce(
            (result: number, current: any) => {
                if (current[1] > result) result = current[1];
                return result;
            },
            pPanelInfo.zero_base === 'Y' ? 0 : array[0]?.[1]
        );
    };
    const getMinValue = (array: number[][]) => {
        return array.reduce(
            (result: number, current: any) => {
                if (current[1] < result) result = current[1];
                return result;
            },
            pPanelInfo.zero_base === 'Y' ? 0 : array[0]?.[1]
        );
    };
    const updateYaxis = () => {
        const yAxis: any = {
            left: [] as number[],
            right: [] as number[],
        };

        const newData = pChartData && JSON.parse(JSON.stringify(pChartData));
        newData?.forEach((item: any) => {
            if (item.yAxis === 0) {
                if (!yAxis.left[0] || yAxis.left[0] > getMinValue(item.data)) {
                    yAxis.left[0] = getMinValue(item.data);
                }
                if (!yAxis.left[1] || yAxis.left[1] < getMaxValue(item.data)) {
                    yAxis.left[1] = getMaxValue(item.data);
                }
            }
            if (item.yAxis === 1) {
                if (!yAxis.right[0] || yAxis.right[0] > getMinValue(item.data)) {
                    yAxis.right[0] = getMinValue(item.data);
                }
                if (!yAxis.right[1] || yAxis.right[1] < getMaxValue(item.data)) {
                    yAxis.right[1] = getMaxValue(item.data);
                }
            }
        });
        if (yAxis.left[0]) {
            yAxis.left[0] = Math.floor(yAxis.left[0] * 1000) / 1000;
            yAxis.left[1] = Math.ceil(yAxis.left[1] * 1000) / 1000;
        }
        if (yAxis.right[0]) {
            yAxis.right[0] = Math.floor(yAxis.right[0] * 1000) / 1000;
            yAxis.right[1] = Math.ceil(yAxis.right[1] * 1000) / 1000;
        }
        return yAxis;
    };

    const setValue = () => {
        setOptions({
            accessibility: {
                enabled: false,
            },
            colors: formatColors(pPanelInfo.color_set),
            chart: {
                spacing: pPanelInfo.show_legend === 'Y' ? [10, 10, 15, 10] : [10, 10, 30, 10],
                height: 300,
                backgroundColor: '#262831',
                type: pPanelInfo.fill > 0 ? 'area' : 'line',
                zoomType: 'x',
                lineWidth: 1,
                width: pAreaChart?.current?.clientWidth,
                events: {
                    selection: pIsMinMaxPopup ? pViewMinMaxPopup : false,
                },
                zooming: {
                    mouseWheel: {
                        enabled: false,
                    },
                },
            },
            time: {
                getTimezoneOffset: () => {
                    return getTimeZoneValue();
                },
            },
            series: pChartData,

            plotOptions: {
                boost: {
                    useGPUTranslations: true,
                    seriesThreshold: 5,
                },
                series: {
                    showInNavigator: false,
                    lineWidth: pPanelInfo.stroke,
                    fillOpacity: pPanelInfo.fill,
                    cursor: 'pointer',
                    marker: {
                        enabled: pPanelInfo.show_point === 'Y',
                        radius: pPanelInfo.point_radius,
                    },
                    states: {
                        hover: {
                            enabled: true,
                            lineWidthPlus: 0,
                            lineWidth: 0,
                        },
                    },
                    dataGrouping: {
                        enabled: false,
                    },
                    point: {},
                },
            },
            scrollbar: {
                liveRedraw: false,
                enabled: false,
            },
            rangeSelector: {
                buttons: [],
                allButtonsEnabled: false,
                selected: 1,
                inputEnabled: false,
            },
            navigator: {
                enabled: true,
                adaptToUpdatedData: false,
                handles: {
                    opacity: 0,
                    height: 26,
                    width: 7,
                },
                height: 24,
                maskFill: 'rgba(119, 119, 119, .3)',
                series:
                    pNavigatorData && pNavigatorData.datasets
                        ? pNavigatorData.datasets.map((i: any) => {
                              return { data: i.data, marker: i.marker, type: 'line', fillOpacity: 1, lineWidth: 1, dataGrouping: { enabled: false }, animation: false };
                          })
                        : [],
                outlineWidth: 1,
                outlineColor: '#323333',
                xAxis: {
                    left: 28,
                    type: 'datetime',
                    min: pNavigatorRange.startTime,
                    max: pNavigatorRange.endTime,
                    labels: {
                        align: 'center',
                        style: {
                            color: '#afb5bc',
                            fontSize: '10px',
                        },
                        y: 20,
                    },
                    events: { setExtremes: pSetNavigatorExtremes },
                    gridLineColor: '#323333',
                },
                yAxis: {
                    gridLineColor: '#323333',
                    gridLineWidth: 1,
                },
                margin: 45,
            },
            xAxis: {
                zoomEnabled: pPanelInfo.use_zoom === 'Y',
                type: 'datetime',
                ordinal: false,
                gridLineWidth: pPanelInfo.show_x_tickline === 'Y' ? 1 : 0,
                gridLineColor: '#323333',
                lineColor: '#323333',
                events: {
                    setExtremes: pSetExtremes,
                },
                labels: {
                    align: 'center',
                    style: {
                        color: '#f8f8f8',
                        fontSize: '10px',
                    },
                    y: 35,
                },
                minorTickColor: 'red',
                min: pPanelRange.startTime,
                max: pPanelRange.endTime,
                crosshair: {
                    snap: false,
                    width: 0.5,
                    color: 'red',
                },
                tickColor: '#323333',
            },
            yAxis: [
                {
                    tickAmount: updateYaxis().left[0] === updateYaxis().left[1] && 1,
                    tickPositions: updateYaxis().left[0] === updateYaxis().left[1] && [updateYaxis().left[0]],
                    min: !pIsRaw
                        ? Number(pPanelInfo.custom_min) === 0 && Number(pPanelInfo.custom_max) === 0
                            ? updateYaxis().left[0]
                            : Number(pPanelInfo.custom_min)
                        : Number(pPanelInfo.custom_drilldown_min) === 0 && Number(pPanelInfo.custom_drilldown_max) === 0
                        ? updateYaxis().left[0]
                        : Number(pPanelInfo.custom_drilldown_min),
                    max: !pIsRaw
                        ? Number(pPanelInfo.custom_min) === 0 && Number(pPanelInfo.custom_max) === 0
                            ? updateYaxis().left[1]
                            : Number(pPanelInfo.custom_max)
                        : Number(pPanelInfo.custom_drilldown_min) === 0 && Number(pPanelInfo.custom_drilldown_max) === 0
                        ? updateYaxis().left[1]
                        : Number(pPanelInfo.custom_drilldown_max),
                    showLastLabel: pPanelInfo.use_normalize === 'N',
                    gridLineWidth: pPanelInfo.show_y_tickline === 'Y' ? 1 : 0,
                    startOnTick: true,
                    endOnTick: true,
                    gridLineColor: '#323333',
                    lineColor: '#323333',
                    labels: {
                        align: 'center',
                        style: {
                            color: '#afb5bc',
                            fontSize: '10px',
                        },
                        x: -5,
                        y: 3,
                    },
                    opposite: false,
                    plotLines: [
                        {
                            color: pPanelInfo.use_ucl === 'Y' ? '#ec7676' : 'transparent', // Color value
                            dashStyle: 'solid', // Style of the plot line. Default to solid
                            value: pPanelInfo.ucl_value, // Value of where the line will appear
                            width: 1, // Width of the line
                            zIndex: 7,
                        },
                        {
                            color: pPanelInfo.use_lcl === 'Y' ? 'orange' : 'transparent', // Color value
                            dashStyle: 'solid', // Style of the plot line. Default to solid
                            value: pPanelInfo.lcl_value, // Value of where the line will appear
                            width: 1, // Width of the line
                            zIndex: 7,
                        },
                    ],
                },
                {
                    tickAmount: updateYaxis().right[0] === updateYaxis().right[1] && 1,
                    tickPositions: updateYaxis().right[0] === updateYaxis().right[1] && [updateYaxis().right[0]],
                    min: !pIsRaw
                        ? Number(pPanelInfo.custom_min2) === 0 && Number(pPanelInfo.custom_max2) === 0
                            ? pPanelInfo.use_normalize === 'Y'
                                ? 0
                                : updateYaxis().left[0]
                            : Number(pPanelInfo.custom_min2)
                        : Number(pPanelInfo.custom_drilldown_min2) === 0 && Number(pPanelInfo.custom_drilldown_max2) === 0
                        ? pPanelInfo.use_normalize === 'Y'
                            ? 0
                            : updateYaxis().left[0]
                        : Number(pPanelInfo.custom_drilldown_min2),
                    max: !pIsRaw
                        ? Number(pPanelInfo.custom_min2) === 0 && Number(pPanelInfo.custom_max2) === 0
                            ? pPanelInfo.use_normalize === 'Y'
                                ? 100
                                : updateYaxis().left[1]
                            : Number(pPanelInfo.custom_max2)
                        : Number(pPanelInfo.custom_drilldown_min2) === 0 && Number(pPanelInfo.custom_drilldown_max2) === 0
                        ? pPanelInfo.use_normalize === 'Y'
                            ? 100
                            : updateYaxis().left[1]
                        : Number(pPanelInfo.custom_drilldown_max2),
                    showLastLabel: pPanelInfo.use_normalize === 'N',
                    gridLineWidth: 1,
                    gridLineColor: '#323333',
                    lineColor: '#323333',
                    startOnTick: true,
                    endOnTick: true,
                    labels: {
                        align: 'center',
                        style: {
                            color: '#afb5bc',
                            fontSize: '10px',
                        },
                        x: -5,
                        y: 3,
                    },
                    opposite: pPanelInfo.use_right_y2 === 'Y',
                    plotLines: [
                        {
                            color: pPanelInfo.use_ucl2 === 'Y' ? '#ec7676' : 'transparent', // Color value
                            dashStyle: 'solid', // Style of the plot line. Default to solid
                            value: pPanelInfo.ucl2_value, // Value of where the line will appear
                            width: 1, // Width of the line
                            zIndex: 7,
                        },
                        {
                            color: pPanelInfo.use_lcl2 === 'Y' ? 'orange' : 'transparent', // Color value
                            dashStyle: 'solid', // Style of the plot line. Default to solid
                            value: pPanelInfo.lcl2_value, // Value of where the line will appear
                            width: 1, // Width of the line
                            zIndex: 7,
                        },
                    ],
                },
            ],
            tooltip: {
                split: false,
                shared: true,
                followPointer: true,
                backgroundColor: '#1f1d1d',
                borderColor: '#292929',
                borderWidth: 1,
                xDateFormat: '%Y-%m-%d %H:%M:%S.%L',
                headerFormat: `<div style="minWidth:0px; paddingLeft:10px; fontSize:10px"><div style="color: #afb5bc">{point.key}</div>`,
                pointFormat:
                    '<br/><div style="display: flex; justifyContent: space-between"><p style="color: {se' +
                    `ries.color}">{series.name} </p><p style="color: {series.color}">{point.y}</p><` +
                    '/div>',
                footerFormat: '<div></div>',
            },
            legend: {
                enabled: pPanelInfo.show_legend === 'Y',
                align: 'left',
                itemDistance: 15,
                itemWidth: pAreaChart?.current?.clientWidth / 6.2,
                squareSymbol: true,
                symbolRadius: 1,
                itemHoverStyle: {
                    color: '#23527c',
                    'text-decoration': 'underline',
                },
                itemStyle: {
                    color: '#e7e8ea',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'none',
                    'font-family': 'Open Sans,Helvetica,Arial,sans-serif',
                    textOverflow: 'ellipsis',
                    'text-decoration': 'none',
                },
                margin: 20,
            },
            lang: {
                noData: 'No data',
            },
            noData: {
                style: {
                    fontFamily: 'Open Sans,Helvetica,Arial,sans-serif',
                    fontSize: '24px',
                    color: '#9ca2ab',
                    fontStyle: 'italic',
                    fontWeight: 'normal',
                },
            },
            credits: {
                enabled: false,
            },
        });
    };

    useEffect(() => {
        setValue();
    }, [pChartData, pNavigatorData, pPanelInfo, pIsRaw, pIsMinMaxPopup, pIsUpdate]);

    return pNavigatorData && pNavigatorData.datasets && <HighchartsReact ref={pChartWrap} highcharts={Highcharts} constructorType={'stockChart'} options={options} />;
};
export default Chart;
