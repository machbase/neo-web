/** REMOVE V$(VIRTUAL TABLE)
 * @aTableName
 */
export const removeV$Table = (aTableName: string) => {
    // Anchored and greedy, because the old lazy `/(V\$.*?)(_STAT)/` stopped at the *first*
    // `_STAT` anywhere in the string: `V$X_STATION_STAT` came back as `X`, and
    // `V$A_STATUS_LOG_STAT` as `A`. Callers pass a single name segment, so the whole segment
    // has to match for the suffix to be the one being stripped.
    const sMatch = aTableName.match(/^V\$(.*)_STAT$/i);
    return sMatch ? sMatch[1] : aTableName;
};
