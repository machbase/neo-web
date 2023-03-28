import { isNull } from 'lodash';

export const baseURL = (): string => {
    let data = {
        theme: 'machIoTchartBlack',
        ip: '127.0.0.1',
        port: '5657',
        timeout: 127,
    };
    data = !isNull(localStorage.getItem('gPreference')) ? JSON.parse(localStorage.getItem('gPreference') as string) : '';
    const IP = data.ip;
    const PORT = data.port;
    // return `http://${window.location.host}/`;
    return `http://${IP}:${PORT}/`;
};
