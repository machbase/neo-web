/**
 * Decode JWT payload and return the parsed JSON object.
 * Returns null if the token is invalid or cannot be decoded.
 */
export const decodeJwtPayload = (token: string): Record<string, any> | null => {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

/**
 * Get the expiration time (unix seconds) from a JWT token.
 * Returns null if the token is invalid or has no exp claim.
 */
export const getJwtExpTime = (token: string): number | null => {
    const payload = decodeJwtPayload(token);
    return payload?.exp ?? null;
};

/**
 * Check if a JWT token will expire within the given threshold (in seconds).
 * Returns true if the token expires within the threshold or is already expired.
 * Returns false if the token is still valid beyond the threshold.
 * Returns null if the token cannot be decoded.
 */
export const isTokenExpiringSoon = (token: string, thresholdSeconds: number): boolean | null => {
    const expTime = getJwtExpTime(token);
    if (expTime === null) return null;
    const nowUnix = Math.floor(Date.now() / 1000);
    return expTime - nowUnix <= thresholdSeconds;
};
