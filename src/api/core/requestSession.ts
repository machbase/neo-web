// HTTP retries and file queues must agree on the lifetime of a login.
let session = 0;

export const getRequestSession = (): number => session;
export const invalidateRequestSession = (): void => { session++; };
