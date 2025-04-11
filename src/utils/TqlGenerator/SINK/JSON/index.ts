/**
 * Cache
 * @CACHE_KEY string
 * @TTL string
 * @r opt - 0 ~ 1.0 // preemptive-cache-update-ratio (r * TTL)
 */
const CACHE = (key: string, ttl: string, r?: number) => {
    const valueList = [JSON.stringify(key), JSON.stringify(ttl)];
    if (r) valueList.push(r.toString());
    return `cache(${valueList})`;
};
const NEO_JSON = (opt?: string) => {
    return `JSON(${opt ?? ''})`;
};

NEO_JSON.Cache = CACHE;
export default NEO_JSON;
