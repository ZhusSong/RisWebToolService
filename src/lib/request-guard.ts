import "server-only";
import { getVisitorIp } from "./visitor-analytics";

type Bucket = { count: number; expires: number };
export type GuardScope = "analytics" | "translate" | "login";
const policies = {
    analytics: { global: 300, client: 60 },
    translate: { global: 100, client: 20 },
    login: { global: 30, client: 5 },
};

// Process-local admission control; persistent business quotas remain separate.
export function createRequestLimiter() {
    const buckets = new Map<string, Bucket>();
    return (scope: GuardScope, client: string | null, now = Date.now()): number => {
        for (const [key, bucket] of buckets) if (bucket.expires <= now) buckets.delete(key);
        const policy = policies[scope];
        const keys: [string, number][] = [[scope, policy.global]];
        if (client) keys.push([`${scope}:${client}`, policy.client]);
        let retry = 0;
        for (const [key, limit] of keys) {
            const bucket = buckets.get(key);
            if (bucket && bucket.count >= limit) retry = Math.max(retry, Math.ceil((bucket.expires - now) / 1000));
        }
        if (retry) return retry;
        // Bound memory even if many distinct clients visit the process.
        if (buckets.size + keys.filter(([key]) => !buckets.has(key)).length > 2048) return 60;
        for (const [key] of keys) {
            const bucket = buckets.get(key) ?? { count: 0, expires: now + 60_000 };
            bucket.count++; buckets.set(key, bucket);
        }
        return 0;
    };
}
const admit = createRequestLimiter();
export function requestRetryAfter(scope: GuardScope, headers: Headers) {
    return admit(scope, getVisitorIp(headers));
}

export class RequestBodyError extends Error {
    constructor(public status: number, public code: string) { super(code); }
}

export async function readLimitedJson(request: Request, limit: number, timeoutMs = 5000): Promise<unknown> {
    const length = request.headers.get("content-length");
    if (length && /^\d+$/.test(length) && Number(length) > limit) {
        void request.body?.cancel().catch(() => {});
        throw new RequestBodyError(413, "requestTooLarge");
    }
    if (!request.body) throw new RequestBodyError(400, "invalidRequest");
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new RequestBodyError(408, "timeout"));
            void reader.cancel().catch(() => {});
        }, timeoutMs);
    });
    try {
        return await Promise.race([(async () => {
            const decoder = new TextDecoder("utf-8", { fatal: true });
            let bytes = 0, text = "";
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                bytes += value.byteLength;
                if (bytes > limit) {
                    void reader.cancel().catch(() => {});
                    throw new RequestBodyError(413, "requestTooLarge");
                }
                text += decoder.decode(value, { stream: true });
            }
            return JSON.parse(text + decoder.decode());
        })(), timedOut]);
    } catch (error) {
        if (error instanceof RequestBodyError) throw error;
        throw new RequestBodyError(400, "invalidRequest");
    } finally { clearTimeout(timer); reader.releaseLock(); }
}
