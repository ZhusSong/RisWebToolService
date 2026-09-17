import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const MAX_TRANSLATION_CHARACTERS = 2_000;

const REQUESTS_PER_MINUTE = 100;

type LimitResult =
    | { ok: true; refund: () => void }
    | {
        ok: false;
        error: "rateLimited" | "quotaExceeded";
    };

let database: Database.Database | undefined;

function getDatabase() {
    if (database) {
        return database;
    }

    const directory = path.join(process.cwd(), "data");
    mkdirSync(directory, { recursive: true });

    const connection = new Database(
        path.join(directory, "translation-usage.db"),
        { timeout: 5_000 }
    );

    connection.exec(`
        CREATE TABLE IF NOT EXISTS translation_monthly_usage (
            month TEXT PRIMARY KEY,
            characters INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS translation_request_limit (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            window_started_at INTEGER NOT NULL,
            requests INTEGER NOT NULL
        );
    `);

    database = connection;
    return connection;
}

function getMonthlyLimit() {
    const configured = process.env.TRANSLATION_MONTHLY_LIMIT;

    const limit =
        configured === undefined
            ? process.env.NODE_ENV === "production"
                ? 450_000
                : 10_000
            : Number(configured);

    if (!Number.isSafeInteger(limit) || limit < 0) {
        throw new Error("Invalid translation monthly limit.");
    }

    return limit;
}

export function reserveTranslationUsage(
    characters: number
): LimitResult {
    if (
        !Number.isSafeInteger(characters) ||
        characters < 1 ||
        characters > MAX_TRANSLATION_CHARACTERS
    ) {
        throw new Error("Invalid translation character count.");
    }

    const connection = getDatabase();
    const monthlyLimit = getMonthlyLimit();

    const reserve = connection.transaction((): LimitResult => {
        const now = Date.now();
        const month = new Date(now).toISOString().slice(0, 7);

        const usage = connection
            .prepare(
                `SELECT characters
                 FROM translation_monthly_usage
                 WHERE month = ?`
            )
            .get(month) as { characters: number } | undefined;

        if ((usage?.characters ?? 0) + characters > monthlyLimit) {
            return { ok: false, error: "quotaExceeded" };
        }

        const rate = connection
            .prepare(
                `SELECT window_started_at, requests
                 FROM translation_request_limit
                 WHERE id = 1`
            )
            .get() as
            | { window_started_at: number; requests: number }
            | undefined;

        const newWindow =
            !rate ||
            now < rate.window_started_at ||
            now - rate.window_started_at >= 60_000;

        if (!newWindow && rate.requests >= REQUESTS_PER_MINUTE) {
            return { ok: false, error: "rateLimited" };
        }

        connection
            .prepare(
                `INSERT INTO translation_request_limit
                     (id, window_started_at, requests)
                 VALUES (1, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                     window_started_at = excluded.window_started_at,
                     requests = excluded.requests`
            )
            .run(
                newWindow ? now : rate!.window_started_at,
                newWindow ? 1 : rate!.requests + 1
            );

        connection
            .prepare(
                `INSERT INTO translation_monthly_usage
                     (month, characters)
                 VALUES (?, ?)
                 ON CONFLICT(month) DO UPDATE SET
                     characters = characters + excluded.characters`
            )
            .run(month, characters);

        let refunded = false;

        return {
            ok: true,
            refund: () => {
                if (refunded) {
                    return;
                }

                // 使用预留时的月份，避免跨月请求退错月份。
                connection
                    .prepare(
                        `UPDATE translation_monthly_usage
                 SET characters = characters - ?
                 WHERE month = ? AND characters >= ?`
                    )
                    .run(characters, month, characters);

                // 同一请求最多返还一次。
                refunded = true;
            },
        };
    });

    // 在同一事务中检查并预留额度，防止并发请求突破上限。
    return reserve.immediate();
}