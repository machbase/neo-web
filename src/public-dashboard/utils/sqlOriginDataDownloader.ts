import moment from 'moment';

export enum DOWNLOADER_EXTENSION {
    CSV = 'csv',
    // ...etc
}

export const sqlOriginDataDownloader = (url: string, extension: DOWNLOADER_EXTENSION, fileName?: string) => {
    const name = fileName ?? moment(new Date()).format('YYYY-MM-DD_HHmmss');
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${name}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};
