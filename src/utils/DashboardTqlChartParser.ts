export const TqlChartParser = (aTqlChartInfo: any, aTimeParams: { start: number; end: number }) => {
    console.log('aTqlChartInfo', aTqlChartInfo);
    console.log('aTimeParams', aTimeParams);
    // list 형식의 params를 변환해줌. (추가 필요함)
    const paramsFilter = (aParamList: any) => {
        // time format에 맞게 차후 변환 필요 (추가 필요함)
        let sTime = `?start=${aTimeParams.start}&end=${aTimeParams.end}`;
        sTime += aParamList;
        return sTime;
    };

    const sResult = `${aTqlChartInfo.path}${paramsFilter(aTqlChartInfo.params)}`;
    return sResult;
};
