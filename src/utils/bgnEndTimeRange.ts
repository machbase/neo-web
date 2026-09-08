import moment from 'moment';

/**
 * For taganalyzer & dashboard
 * @param aTime number
 * @param aSubtract string (ex - 1m, 1h, 1d...)
 * @returns time - subtract (milli sec)
 */
export const subtractTime = (aTime: number, aSubtract: string) => {
    const sSubtract = aSubtract.split('-')[1];
    let sResult = Math.floor(aTime / 1000000); // Set ms
    if (sSubtract) {
        const sTimeNumber = parseInt(sSubtract);
        const sTimeUnit = sSubtract.match(/[a-zA-Z]/g)?.join('');
        sResult =
            moment(aTime / 1000000)
                .subtract(sTimeNumber, sTimeUnit as any)
                .unix() * 1000;
    }
    return sResult;
};

export const timeMinMaxConverter = (aStart: string | number, aEnd: string | number, aSvrRes: { min: number; max: number }) => {
    let sTimeMinMax: any = undefined;

    if (typeof aStart === 'string' && typeof aEnd === 'string') {
        // Empty case
        if (aStart === '') {
            sTimeMinMax = aSvrRes;
            return sTimeMinMax;
        }

        const sStartHasLast = aStart.includes('last');
        const sStartHasNow = aStart.includes('now');
        const sEndHasLast = aEnd.includes('last');
        const sEndHasNow = aEnd.includes('now');

        // Both are 'last' - use server response as reference
        if (sStartHasLast && sEndHasLast) {
            sTimeMinMax = {
                min: subtractTime(aSvrRes.max * 1000000, aStart),
                max: subtractTime(aSvrRes.max * 1000000, aEnd),
            };
            return sTimeMinMax;
        }

        // Both are 'now' - use current time as reference
        if (sStartHasNow && sEndHasNow) {
            const sNowTime = moment().unix() * 1000;
            sTimeMinMax = {
                min: subtractTime(sNowTime * 1000000, aStart),
                max: subtractTime(sNowTime * 1000000, aEnd),
            };
            return sTimeMinMax;
        }

        // Mixed case: one is 'last'/'now', the other is date format or different type
        // Return undefined to let caller handle via setUnitTime
        if (sStartHasLast || sStartHasNow || sEndHasLast || sEndHasNow) {
            return undefined;
        }
    }

    // Number case
    if (typeof aStart === 'number') {
        sTimeMinMax = { min: aStart, max: aEnd };
    }

    return sTimeMinMax;
};
