/**
 * Per-language LSP metadata cache with inflight request deduplication.
 *
 * The Monaco token registration path (`tokens.ts`) and future completion/hover
 * providers all need the same `lsp.metadata` payload. Without dedup, every
 * provider would trigger its own JSON-RPC roundtrip on first editor mount.
 *
 * Caching rules:
 *  - Resolved metadata is cached in `sMetadataCache` for the lifetime of the
 *    module (one cache entry per language).
 *  - In-flight promises live in `sMetadataRequests` so concurrent callers
 *    share a single network request.
 *  - On rejection, the inflight slot is cleared but the cache is NOT populated
 *    — a later call will retry. (Failed metadata fetches should not poison
 *    the editor permanently.)
 *
 * Cache invalidation:
 *  - `clearLspMetadataCache(language)` drops one language; no-arg drops all.
 *    Intended for hot-reload / dev workflows; production code generally
 *    leaves the cache alone.
 */

import { getLspMetadata, type LspLanguage } from '@/api/repository/lsp';
import type { LspMetadata } from '@/lsp/types';

const sMetadataCache = new Map<LspLanguage, LspMetadata>();
const sMetadataRequests = new Map<LspLanguage, Promise<LspMetadata>>();

export const getCachedLspMetadata = (language: LspLanguage): LspMetadata | undefined =>
    sMetadataCache.get(language);

export const loadLspMetadata = (language: LspLanguage, signal?: AbortSignal): Promise<LspMetadata> => {
    const cached = sMetadataCache.get(language);
    if (cached) return Promise.resolve(cached);

    const inflight = sMetadataRequests.get(language);
    if (inflight) return inflight;

    const request = getLspMetadata(language, signal)
        .then((response) => {
            // The transport returns LspResponse<any>; the server payload may be
            // either the metadata object directly or wrapped under `metadata`.
            // Normalize both shapes to LspMetadata.
            const raw = response?.data;
            const metadata: LspMetadata = (raw?.metadata ?? raw ?? {}) as LspMetadata;
            sMetadataCache.set(language, metadata);
            sMetadataRequests.delete(language);
            return metadata;
        })
        .catch((error) => {
            // Failed fetch: clear inflight so a later caller can retry,
            // but do NOT populate the cache.
            sMetadataRequests.delete(language);
            throw error;
        });

    sMetadataRequests.set(language, request);
    return request;
};

export const clearLspMetadataCache = (language?: LspLanguage) => {
    if (language) {
        sMetadataCache.delete(language);
        sMetadataRequests.delete(language);
        return;
    }
    sMetadataCache.clear();
    sMetadataRequests.clear();
};
