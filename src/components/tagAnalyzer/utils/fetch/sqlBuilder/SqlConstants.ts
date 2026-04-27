export const SELECT_KEYWORD = 'SELECT';
export const FROM_KEYWORD = 'FROM';
export const WHERE_KEYWORD = 'WHERE';
export const AND_KEYWORD = 'AND';
export const IN_KEYWORD = 'IN';
export const BETWEEN_KEYWORD = 'BETWEEN';
export const AS_KEYWORD = 'AS';
export const GROUP_BY_KEYWORD = 'GROUP BY';
export const ORDER_BY_KEYWORD = 'ORDER BY';
export const LIMIT_KEYWORD = 'LIMIT';
export const UNION_ALL_KEYWORD = 'UNION ALL';
export const ASC_KEYWORD = 'ASC';
export const DESC_KEYWORD = 'DESC';

export const M_TIME_ALIAS = 'mTime';
export const M_VALUE_ALIAS = 'mValue';
export const SUMMVAL_ALIAS = 'SUMMVAL';
export const CNTMVAL_ALIAS = 'CNTMVAL';

export const TIME_RESULT_ALIAS = 'time';
export const VALUE_RESULT_ALIAS = 'value';
export const DATE_RESULT_ALIAS = 'date';

export const TIME_COLUMN_NAME = 'TIME';
export const NAME_COLUMN_NAME = 'NAME';
export const MIN_TIME_COLUMN_NAME = 'min_time';
export const MAX_TIME_COLUMN_NAME = 'max_time';
export const MIN_TIME_RESULT_ALIAS = 'min_tm';
export const MAX_TIME_RESULT_ALIAS = 'max_tm';

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;

export const GROUP_BY_M_TIME_CLAUSE = `${GROUP_BY_KEYWORD} ${M_TIME_ALIAS}`;
export const ORDER_BY_M_TIME_CLAUSE = `${ORDER_BY_KEYWORD} ${M_TIME_ALIAS}`;
export const GROUP_BY_TIME_RESULT_CLAUSE = `${GROUP_BY_KEYWORD} TIME`;
export const ORDER_BY_TIME_RESULT_CLAUSE = `${ORDER_BY_KEYWORD} TIME`;
