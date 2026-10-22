"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./LanguageProvider";

export default function FileConverter() {
    const { messages } = useI18n();
    const m = messages.tools.fileConverter;
    const [file, setFile] = useState<File | null>(null);
    const [format, setFormat] = useState("pdf");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
    const url = useRef<string | null>(null);
    const controller = useRef<AbortController | null>(null);
    useEffect(() => () => { controller.current?.abort(); if (url.current) URL.revokeObjectURL(url.current); }, []);
    function clearResult() { if (url.current) URL.revokeObjectURL(url.current); url.current = null; setDownload(null); setError(""); }
    async function convert() {
        if (busy || !file) return;
        clearResult();
        if (file.size === 0 || file.size > 5 * 1024 * 1024) { setError(m.size); return; }
        setBusy(true);
        const abort = new AbortController(); controller.current = abort;
        const timer = setTimeout(() => abort.abort(), 115000);
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            let raw = "";
            for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
            const response = await fetch("/api/convert", { method: "POST", cache: "no-store", credentials: "same-origin", signal: abort.signal,
                headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, file: { name: file.name, data: btoa(raw) } }) });
            const body = await response.json();
            if (!response.ok) {
                const reasons: Record<string, string> = { busy: m.busy, rateLimited: m.busy, size: m.size, requestTooLarge: m.size, invalid: m.invalid,
                    pageLimit: m.pageLimit, scannedPdf: m.scannedPdf, unsafeOffice: m.unsafeOffice, encrypted: m.unsafeOffice, unsupportedPair: m.invalid, outputLimit: m.outputLimit };
                throw new Error(reasons[body.error] ?? m.unavailable);
            }
            const blob = new Blob([Uint8Array.from(atob(body.artifact.data), char => char.charCodeAt(0))], { type: "application/octet-stream" });
            url.current = URL.createObjectURL(blob);
            setDownload({ url: url.current, name: body.artifact.name });
            if (body.warning === 'noTables') setError(m.noTables);
        } catch (e) { setError(e instanceof Error && e.name !== "AbortError" && e.name !== "SyntaxError" ? e.message : m.unavailable); }
        finally { clearTimeout(timer); controller.current = null; setBusy(false); }
    }
    const control = "rounded-xl border border-slate-300 bg-white p-3 disabled:opacity-50";
    return <section className="space-y-6 text-[#293845]">
        <h1 className="text-3xl font-semibold">{m.title}</h1>
        <p className="leading-7 text-slate-600">{m.description}</p>
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
            <label className="block space-y-2"><span className="block font-medium">{m.choose}</span>
                <input type="file" disabled={busy} accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp" className={`${control} w-full`} onChange={event => { const next = event.target.files?.[0] ?? null; setFile(next); setFormat(next?.name.toLowerCase().endsWith('.pdf') ? 'docx' : 'pdf'); clearResult(); }} /></label>
            <label className="block space-y-2"><span className="block font-medium">{m.format}</span>
                <select disabled={busy} value={format} className={control} onChange={event => { setFormat(event.target.value); clearResult(); }}>
                    {(/\.(doc|xls|ppt|odt|ods|odp)$/i.test(file?.name ?? '') ? ["pdf"] : ["pdf", "txt", "md", "docx", "xlsx", "pptx", "csv", "json", "zip"]).map(value => <option key={value} value={value}>{({ docx: "Word (.docx)", xlsx: "Excel (.xlsx)", pptx: "PowerPoint (.pptx)" } as Record<string, string>)[value] ?? value.toUpperCase()}</option>)}
                </select></label>
            <button disabled={busy || !file} onClick={convert} className="rounded-xl bg-[#435D73] px-6 py-3 text-white disabled:opacity-40">{busy ? m.working : m.convert}</button>
            <p role="status" className="text-sm text-red-700">{error}</p>
            {download && <a href={download.url} download={download.name} className="block font-medium text-blue-700 underline">{m.download}: {download.name}</a>}
        </div>
        <p className="text-sm leading-7 text-slate-600">{m.limits}</p>
        <p className="text-sm leading-7 text-slate-600">{m.privacy}</p>
    </section>;
}
