import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
    MAX_TRANSLATION_CHARACTERS,
    reserveTranslationUsage,
} from "../../../lib/translation-limit";

export const runtime = "nodejs";

const supportedLanguages = new Set(["zh-CN", "en", "ja"]);
const MAX_BODY_BYTES = 32_000;

const responseHeaders = {
    "Cache-Control": "no-store",
};

function fail(error: string, status: number) {
    return Response.json(
        { error },
        { status, headers: responseHeaders }
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

// 限制请求体大小，避免读取过大的输入。
async function readBody(request: Request): Promise<unknown> {
    if (!request.body) {
        throw new Error("Invalid request body.");
    }

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let content = "";

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            bytes += value.byteLength;

            if (bytes > MAX_BODY_BYTES) {
                await reader.cancel();
                throw new Error("Request body too large.");
            }

            content += decoder.decode(value, { stream: true });
        }

        content += decoder.decode();
        return JSON.parse(content);
    } finally {
        reader.releaseLock();
    }
}

let analyticsDatabase: Database.Database | undefined;

function recordSuccessfulTranslation() {
    if (!analyticsDatabase) {
        const directory = path.join(process.cwd(), "data");
        mkdirSync(directory, { recursive: true });

        const connection = new Database(
            path.join(directory, "analytics.db"),
            { timeout: 5_000 }
        );

        connection.exec(`
            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                tool_name TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        analyticsDatabase = connection;
    }

    analyticsDatabase
        .prepare(
            `INSERT INTO analytics_events (event_type, tool_name)
             VALUES (?, ?)`
        )
        .run("tool_use", "文本翻译");
}

export async function POST(request: Request) {
    let body: unknown;

    try {
        body = await readBody(request);
    } catch {
        return fail("invalidRequest", 400);
    }

    if (!isRecord(body) || typeof body.text !== "string") {
        return fail("invalidRequest", 400);
    }

    const text = body.text;

    if (!text.trim()) {
        return fail("emptyText", 400);
    }

    // 按 Unicode 码点计算，避免将一个普通 emoji 算作两个字符。
    const characters = Array.from(text).length;

    if (characters > MAX_TRANSLATION_CHARACTERS) {
        return fail("textTooLong", 400);
    }

    const source = body.source ?? "auto";
    const target = body.target;

    if (
        typeof source !== "string" ||
        typeof target !== "string" ||
        (source !== "auto" && !supportedLanguages.has(source)) ||
        !supportedLanguages.has(target)
    ) {
        return fail("invalidLanguage", 400);
    }

    if (source === target) {
        return fail("sameLanguage", 400);
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();

    if (!apiKey) {
        return fail("unavailable", 503);
    }

    let refundUsage: (() => void) | undefined;

    try {
        const reservation = reserveTranslationUsage(characters);

        if (!reservation.ok) {
            return fail(reservation.error, 429);
        }

        refundUsage = reservation.refund;
    } catch {
        console.error("Translation usage reservation failed.");
        return fail("unavailable", 503);
    }

    // 不自动重试，避免同一请求产生重复费用。
    const timeout = AbortSignal.timeout(15_000);
    let translationSucceeded = false;
    try {
        const googleResponse = await fetch(
            "https://translation.googleapis.com/language/translate/v2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": apiKey,
                },
                body: JSON.stringify({
                    q: text,
                    target,
                    format: "text",
                    model: "nmt",
                    ...(source === "auto" ? {} : { source }),
                }),
                cache: "no-store",
                signal: timeout,
            }
        );

        if (!googleResponse.ok) {
            // 仅记录状态码，不记录密钥、原文或 Google 返回的完整内容。
            console.error(
                "Google Translation request failed:",
                googleResponse.status
            );

            return fail("unavailable", 503);
        }

        const result: unknown = await googleResponse.json();

        if (
            !isRecord(result) ||
            !isRecord(result.data) ||
            !Array.isArray(result.data.translations)
        ) {
            return fail("unavailable", 502);
        }

        const translation: unknown = result.data.translations[0];

        if (
            !isRecord(translation) ||
            typeof translation.translatedText !== "string"
        ) {
            return fail("unavailable", 502);
        }

        // 已收到有效译文，保留本次字符扣除。
        translationSucceeded = true;

        try {
            recordSuccessfulTranslation();
        } catch {
            // 统计写入失败时仍返回译文，避免用户重复翻译。
            console.error("Translation analytics write failed.");
        }

        return Response.json(
            {
                translatedText: translation.translatedText,
                detectedSourceLanguage:
                    typeof translation.detectedSourceLanguage === "string"
                        ? translation.detectedSourceLanguage
                        : source === "auto"
                            ? null
                            : source,
            },
            { headers: responseHeaders }
        );
    } catch {
        return fail(
            timeout.aborted ? "timeout" : "unavailable",
            timeout.aborted ? 504 : 503
        );
    } finally {
        // 包括 Google 报错、超时、断网和无效响应。
        if (!translationSucceeded && refundUsage) {
            try {
                refundUsage();
            } catch {
                console.error("Translation quota refund failed.");
            }
        }
    }
}