interface TimeFormat {
    [key: string]: string;
}

const TIME_FORMAT_LIST: TimeFormat[] = [
    { name: 'TIMESTAMP(ns)', id: 'ns' },
    { name: 'TIMESTAMP(us)', id: 'us' },
    { name: 'TIMESTAMP(ms)', id: 'ms' },
    { name: 'TIMESTAMP(s)', id: 's' },
    { name: 'YYYY-MM-DD', id: '2006-01-02' },
    { name: 'YYYY-DD-MM', id: '2006-02-01' },
    { name: 'DD-MM-YYYY', id: '02-01-2006' },
    { name: 'MM-DD-YYYY', id: '01-02-2006' },
    { name: 'YY-DD-MM', id: '06-02-01' },
    { name: 'YY-MM-DD', id: '06-01-02' },
    { name: 'MM-DD-YY', id: '01-02-06' },
    { name: 'DD-MM-YY', id: '02-01-06' },
    { name: 'YYYY-MM-DD HH:MI:SS', id: '2006-01-02 15:04:05' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSS', id: '2006-01-02 15:04:05.000' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSSSSS', id: '2006-01-02 15:04:05.000000' },
    { name: 'YYYY-MM-DD HH:MI:SS.SSSSSSSSS', id: '2006-01-02 15:04:05.000000000' },
    { name: 'YYYY-MM-DD HH', id: '2006-01-02 15' },
    { name: 'YYYY-MM-DD HH:MI', id: '2006-01-02 15:04' },
    { name: 'HH:MI:SS', id: '03:04:05' },
];

export { TIME_FORMAT_LIST, type TimeFormat };
