import moment from 'moment';
import {
    formatTimeUnitShortCode,
    normalizeTimeUnit,
    TimeUnit,
    type AxisRange,
    type IntervalOption,
    type RangeExpressionInput,
} from '../rangeModel';
import { getRangeWidth, isValidRange } from '../rangeArithmetic';

const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const LOCAL_DATE_TIME_INPUT_FORMAT = `${DATE_TIME_INPUT_FORMAT}.SSS`;

const LOCAL_DATE_TIME_PATTERN =
    /^(\d{4})(?:-(\d{0,2})(?:-(\d{0,2})(?:[ T](\d{0,2})(?::(\d{0,2})(?::(\d{0,2})(?:\.(\d{0,3}))?)?)?)?)?)?$/;

const INTEGER_TIMESTAMP_PATTERN = /^\d+$/;

const AXIS_SECOND_LABEL_SPAN_MS = 60 * 60 * 1000;

const AXIS_MINUTE_LABEL_SPAN_MS = 24 * 60 * 60 * 1000;

const AXIS_DAY_TIME_LABEL_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

type TimeRangeExpressionResolutionOptions = {
    currentTime?: number;
    firstDataTime?: number;
    lastDataTime?: number;
};

type TimeResolutionAnchors = {
    currentTime: number;
    firstDataTime: number | undefined;
    lastDataTime: number | undefined;
};

const RELATIVE_TIME_PATTERN =
    /^([A-Za-z]+)(?:([+-])(\d+)(ms|s|m|h|d|w|M|y))?$/;

export function resolveBoardTimeRangeInput(
    timeRangeInput: RangeExpressionInput,
    options: TimeRangeExpressionResolutionOptions = {},
): AxisRange | undefined {
    return resolveTimestampRangeInput(timeRangeInput, {
        currentTime:
            normalizeOptionalTime(options.currentTime) ?? moment().valueOf(),
        firstDataTime: normalizeOptionalTime(options.firstDataTime),
        lastDataTime: normalizeOptionalTime(options.lastDataTime),
    });
}

function resolveTimeStringToTimestamp(
    timeString: string,
    anchors: TimeResolutionAnchors,
): number | undefined {
    const sValue = timeString.trim();

    if (sValue === '') {
        return undefined;
    }

    const sMatch = sValue.match(RELATIVE_TIME_PATTERN);
    const sAnchor = sMatch?.[1].toLowerCase();
    if (
        !sMatch ||
        (sAnchor !== 'now' && sAnchor !== 'first' && sAnchor !== 'last')
    ) {
        return parseAbsoluteTimeExpression(sValue);
    }

    const sOperator = sMatch[2];
    if (
        (sAnchor === 'first' && sOperator === '-') ||
        (sAnchor !== 'first' && sOperator === '+')
    ) {
        return undefined;
    }

    const sAmount = sMatch[3] ? Number(sMatch[3]) : 0;
    const sUnit = sMatch[4]
        ? normalizeTimeUnit(sMatch[4])
        : TimeUnit.Millisecond;
    if (!Number.isFinite(sAmount) || !sUnit) {
        return parseAbsoluteTimeExpression(sValue);
    }

    const sAnchorTime = sAnchor === 'now'
        ? anchors.currentTime
        : sAnchor === 'first'
          ? anchors.firstDataTime
          : anchors.lastDataTime;
    if (sAnchorTime === undefined) {
        return undefined;
    }

    if (sAmount <= 0) {
        return sAnchorTime;
    }

    const sMomentUnit =
        sUnit === TimeUnit.Second
            ? 'second'
            : sUnit === TimeUnit.Minute
              ? 'minute'
              : sUnit;
    const sAnchorMoment = moment(sAnchorTime);
    return (sAnchor === 'first'
        ? sAnchorMoment.add(sAmount, sMomentUnit)
        : sAnchorMoment.subtract(sAmount, sMomentUnit)
    ).valueOf();
}

function normalizeOptionalTime(value: number | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

export function parseAbsoluteTimeExpression(value: string): number | undefined {
    const sParsed = moment(
        value.trim(),
        [DATE_TIME_INPUT_FORMAT, moment.ISO_8601],
        true,
    );

    return sParsed.isValid() ? sParsed.valueOf() : undefined;
}

export function formatAbsoluteTimeExpression(timestamp: number): string {
    return moment(timestamp).format(DATE_TIME_INPUT_FORMAT);
}

export function formatRelativeTimeExpression(
    anchor: 'now' | 'first' | 'last',
    amount: number,
    unit: TimeUnit,
): string {
    return amount <= 0
        ? anchor
        : `${anchor}${anchor === 'first' ? '+' : '-'}${amount}${formatTimeUnitShortCode(unit)}`;
}

type ResolveEditableTimeRangeExpressionParams = {
    startValue: string;
    endValue: string;
    previousConcreteRange: AxisRange;
    currentTime: number;
    firstDataTime: number;
    lastDataTime: number;
};

type EditableTimeRangeExpressionResolution =
    | {
          status: 'valid' | 'empty';
          rangeInput: RangeExpressionInput;
          concreteRange: AxisRange;
      }
    | { status: 'invalid' };

export function resolveEditableTimeRangeInput({
    startValue,
    endValue,
    previousConcreteRange,
    currentTime,
    firstDataTime,
    lastDataTime,
}: ResolveEditableTimeRangeExpressionParams): EditableTimeRangeExpressionResolution {
    const sStart = startValue.trim();
    const sEnd = endValue.trim();

    if (sStart === '' && sEnd === '') {
        return {
            status: 'empty',
            rangeInput: { start: '', end: '' },
            concreteRange: isValidRange(previousConcreteRange)
                ? previousConcreteRange
                : { startTime: currentTime - 1, endTime: currentTime },
        };
    }

    const sConcreteRange = resolveBoardTimeRangeInput(
        { start: sStart, end: sEnd },
        { currentTime, firstDataTime, lastDataTime },
    );
    if (sConcreteRange === undefined) {
        return { status: 'invalid' };
    }

    return {
        status: 'valid',
        rangeInput: { start: sStart, end: sEnd },
        concreteRange: sConcreteRange,
    };
}

export function isValidTimestampRangeExpression(value: string): boolean {
    const sValue = value.trim();
    return (
        sValue === '' ||
        resolveTimeStringToTimestamp(sValue, {
            currentTime: 0,
            firstDataTime: 0,
            lastDataTime: 0,
        }) !== undefined
    );
}

export function resolveTimestampRangeInput(
    rangeInput: RangeExpressionInput,
    anchors: TimeResolutionAnchors,
    emptyBoundaryRange?: AxisRange,
): AxisRange | undefined {
    const sStartTime =
        rangeInput.start.trim() === ''
            ? emptyBoundaryRange?.startTime
            : resolveTimeStringToTimestamp(rangeInput.start, anchors);
    const sEndTime =
        rangeInput.end.trim() === ''
            ? emptyBoundaryRange?.endTime
            : resolveTimeStringToTimestamp(rangeInput.end, anchors);

    if (sStartTime === undefined || sEndTime === undefined) {
        return undefined;
    }

    const sResolvedRange: AxisRange = {
        startTime: sStartTime,
        endTime: sEndTime,
    };
    return isValidRange(sResolvedRange) ? sResolvedRange : undefined;
}

export function formatTimeRange(range: AxisRange) {
    return {
        start: moment(range.startTime).format(DATE_TIME_INPUT_FORMAT),
        end: moment(range.endTime).format(DATE_TIME_INPUT_FORMAT),
    };
}

export function formatTimeInterval(
    interval: IntervalOption | undefined,
): string {
    return interval
        ? `${interval.IntervalValue}${interval.IntervalType}`
        : '';
}

export function formatTimeAxisInputValue(value: number): string {
    return Number.isFinite(value)
        ? moment(value).format(LOCAL_DATE_TIME_INPUT_FORMAT)
        : '';
}

export function parseTimeAxisInputValue(value: string): number | undefined {
    const text: string = value.trim();
    if (text === '') {
        return undefined;
    }

    const match: RegExpExecArray | null = LOCAL_DATE_TIME_PATTERN.exec(text);
    if (!match) {
        if (!INTEGER_TIMESTAMP_PATTERN.test(text)) {
            return undefined;
        }

        const timestamp: number = Number(text);
        return Number.isSafeInteger(timestamp) ? timestamp : undefined;
    }

    const parts = [
        Number(match[1]),
        match[2] ? Number(match[2]) : 1,
        match[3] ? Number(match[3]) : 1,
        match[4] ? Number(match[4]) : 0,
        match[5] ? Number(match[5]) : 0,
        match[6] ? Number(match[6]) : 0,
        Number((match[7] || '0').padEnd(3, '0')),
    ] as const;
    const [year, month, day, hour, minute, second, millisecond] = parts;
    if (
        !parts.every(Number.isInteger) ||
        month < 1 ||
        month > 12 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59 ||
        millisecond < 0 ||
        millisecond > 999
    ) {
        return undefined;
    }

    const timestamp: number = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        millisecond,
    ).getTime();
    const date: Date = new Date(timestamp);
    const resolvedParts: number[] = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
    ];

    return resolvedParts.every((part, index) => part === parts[index])
        ? timestamp
        : undefined;
}

export function formatTimeAxisPointerLabel(value: number): string {
    const baseTimestamp: number = Math.trunc(value);
    const fractionalPart: string | undefined = String(value).split('.')[1];
    const formatted: string = moment(baseTimestamp).format(
        'YYYY-MM-DD HH:mm:ss.SSS',
    );

    return fractionalPart ? `${formatted}${fractionalPart}` : formatted;
}

export function formatTimeAxisValue(
    value: number,
    range: AxisRange,
): string {
    const visibleSpan: number = getRangeWidth(range);
    if (visibleSpan <= AXIS_SECOND_LABEL_SPAN_MS) {
        return moment(value).format('HH:mm:ss');
    }
    if (visibleSpan <= AXIS_MINUTE_LABEL_SPAN_MS) {
        return moment(value).format('HH:mm');
    }
    if (visibleSpan <= AXIS_DAY_TIME_LABEL_SPAN_MS) {
        return moment(value).format('MM-DD HH:mm');
    }
    return moment(value).format('YYYY-MM-DD');
}

export function formatTimeRangeSpanLabel(
    startTime: number,
    endTime: number,
): string {
    const duration: moment.Duration = moment.duration(endTime - startTime);
    const days: number = Math.floor(duration.asDays());
    return [
        days === 0 ? '' : `${days}d`,
        duration.hours() === 0 ? '' : `${duration.hours()}h`,
        duration.minutes() === 0 ? '' : `${duration.minutes()}m`,
        duration.seconds() === 0 ? '' : `${duration.seconds()}s`,
        duration.milliseconds() === 0
            ? ''
            : `${duration.milliseconds()}ms`,
    ]
        .filter(Boolean)
        .join(' ');
}
