import { ComboboxOption } from '@/design-system/components';

const TIME_FORMAT_LIST: ComboboxOption[] = [
    { label: 'TIMESTAMP(ns)', value: 'ns' },
    { label: 'TIMESTAMP(us)', value: 'us' },
    { label: 'TIMESTAMP(ms)', value: 'ms' },
    { label: 'TIMESTAMP(s)', value: 's' },
    { label: 'YYYY-MM-DD', value: '2006-01-02' },
    { label: 'YYYY-DD-MM', value: '2006-02-01' },
    { label: 'DD-MM-YYYY', value: '02-01-2006' },
    { label: 'MM-DD-YYYY', value: '01-02-2006' },
    { label: 'YY-DD-MM', value: '06-02-01' },
    { label: 'YY-MM-DD', value: '06-01-02' },
    { label: 'MM-DD-YY', value: '01-02-06' },
    { label: 'DD-MM-YY', value: '02-01-06' },
    { label: 'YYYY-MM-DD HH:MI:SS', value: '2006-01-02 15:04:05' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSS', value: '2006-01-02 15:04:05.000' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSSSSS', value: '2006-01-02 15:04:05.000000' },
    { label: 'YYYY-MM-DD HH:MI:SS.SSSSSSSSS', value: '2006-01-02 15:04:05.000000000' },
    { label: 'YYYY-MM-DD HH', value: '2006-01-02 15' },
    { label: 'YYYY-MM-DD HH:MI', value: '2006-01-02 15:04' },
    { label: 'HH:MI:SS', value: '03:04:05' },
];

export { TIME_FORMAT_LIST };
