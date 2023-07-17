export enum StatusCodeEnum {
    BadRequest = 400,
    enuUnauthorized = 401,
    Forbidden = 403,
    TooManyRequests = 429,
    ValidationFailed = 422,
    InternalServerError = 500,
}

export enum TypeFolder {
    EQUIP = 'equip',
    GROUP = 'group',
}

export enum ResStatus {
    SUCCESS = 'success',
    FAILED = 'failed',
}

export enum ChartType {
    Zone,
    Dot,
    Line,
}
export enum PopupType {
    NEW_CHART = 'New Chart',
    MANAGE_DASHBOARD = 'Manage Dashboard',
    NEW_TAGS = 'Add New Tags',
    PREFERENCES = 'Preferences',
    SAVE_DASHBOARD = 'Save Dashboard',
    TIME_RANGE = 'Time range',
    TIME_DURATION = 'Time Duration',
    ADD_TAB = 'Add Tab',
    LICENSE = 'License',
    FILE_BROWSER = 'File Browser',
    CLONEABLE = 'cloneable',
    REMOVABLE = 'removable',
    EDITABLE = 'editable',
}
export enum IconList {
    LINK = 'mdi-link-variant',
    SQL = 'mdi-file-document-outline',
    TQL = 'mdi-chart-scatter-plot',
    WRK = 'mdi-clipboard-text-play-outline',
    TAZ = 'mdi-chart-line',
    SHELL = 'mdi-console',
    NEW = 'mdi-note-outline',
    DIR = 'mdi-folder',
    UPL = 'mdi-tray-arrow-down',
}
