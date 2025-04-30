import { E_TQL_MAP } from '..';

const MAPVALUE = (idx: number, value: string) => {
    return `${E_TQL_MAP.MAPVALUE}(${idx}, ${value})`;
};

export default MAPVALUE;
