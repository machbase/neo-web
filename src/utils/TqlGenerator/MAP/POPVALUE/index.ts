import { E_TQL_MAP } from '..';

const POPVALUE = (idx: number) => {
    return `${E_TQL_MAP.POPVALUE}(${idx})`;
};

export default POPVALUE;
