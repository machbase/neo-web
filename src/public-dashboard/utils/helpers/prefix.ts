const host = window.location.host;
const path = window.location.pathname;
const prefix = path.split('/ui/');

export const BasePrefix = prefix[0].replace(/\/+$/, '');
export const BaseUrl = host + BasePrefix;
