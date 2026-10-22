import { readLimitedJson, RequestBodyError, requestRetryAfter } from "../../../lib/request-guard";

export const runtime = "nodejs";
const formats = new Set(["txt", "md", "csv", "json", "docx", "xlsx", "pdf", "pptx", "zip"]);
const inputs = /\.(txt|md|csv|json|pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function fail(error: string, status: number) { return Response.json({ error }, { status, headers }); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

export async function POST(request: Request) {
    try {
        const origin = request.headers.get("origin");
        if (!origin || new URL(origin).host !== request.headers.get("host")) return fail("origin", 403);
    } catch { return fail("origin", 403); }
    const retry = requestRetryAfter("convert", request.headers);
    if (retry) return Response.json({ error: "busy" }, { status: 429, headers: { ...headers, "Retry-After": String(retry) } });
    try {
        const body = await readLimitedJson(request, 7 * 1024 * 1024, 30000);
        if (!record(body) || typeof body.format !== "string" || !formats.has(body.format) || !record(body.file)) return fail("invalid", 400);
        const file = body.file;
        if (typeof file.name !== "string" || file.name.length > 200 || !inputs.test(file.name) || typeof file.data !== "string" || file.data.length > 6990508 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) return fail("invalid", 400);
        if (!file.data || Buffer.from(file.data, "base64").length > 5 * 1024 * 1024) return fail("invalid", 413);
        // Fixed loopback URL: never forward cookies, tokens, client URLs or AI parameters.
        const response = await fetch("http://127.0.0.1:3004/convert-api/process", {
            method: "POST", cache: "no-store", redirect: "error",
            headers: { "Content-Type": "application/json", Origin: "https://ristoolweb.com" },
            body: JSON.stringify({ format: body.format, files: [{ name: file.name, data: file.data }] }),
            signal: AbortSignal.timeout(110000),
        });
        if (!response.ok) {
            const problem = await response.json().catch(() => ({}));
            const allowed = new Set(["pageLimit", "scannedPdf", "unsafeOffice", "unsupportedPair", "outputLimit", "encrypted"]);
            return fail(response.status === 429 ? "busy" : allowed.has(problem.error) ? problem.error : response.status === 400 ? "invalid" : "unavailable", response.status === 429 ? 429 : response.status === 400 ? 400 : 502);
        }
        const result = await response.json();
        if (!record(result) || !record(result.artifact) || typeof result.artifact.data !== "string") return fail("unavailable", 502);
        return Response.json({ artifact: { name: `RISTOOL-result.${body.format}`, mime: "application/octet-stream", data: result.artifact.data }, warning: result.warning === 'noTables' ? 'noTables' : '' }, { headers });
    } catch (error) {
        return fail(error instanceof RequestBodyError ? (error.status === 413 ? "size" : "invalid") : "unavailable", error instanceof RequestBodyError ? error.status : 503);
    }
}
