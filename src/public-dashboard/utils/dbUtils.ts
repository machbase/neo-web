/** REMOVE V$(VIRTUAL TABLE)
 * @aTableName
 */
export const removeV$Table = (aTableName: string) => {
    const reg = new RegExp(/(V\$.*?)(_STAT)/g);
    const sResult = aTableName.match(reg);
    if (sResult && sResult?.length >= 1) return sResult[0].replace('V$', '').replace('_STAT', '');
    else return aTableName;
};
