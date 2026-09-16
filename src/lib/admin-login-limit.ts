import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });

const database = new Database(
    path.join(dataDirectory, "admin-auth.db")
);

database.exec(`
    CREATE TABLE IF NOT EXISTS admin_login_limit (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        window_started_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL
    )
`);

const checkAndRecordAttempt = database.transaction((): boolean => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;

    const row = database.prepare(`
        SELECT window_started_at, attempts
        FROM admin_login_limit
        WHERE id = 1
    `).get() as {
        window_started_at: number;
        attempts: number;
    } | undefined;

    if (!row || now - row.window_started_at >= windowMs) {
        database.prepare(`
            INSERT INTO admin_login_limit (id, window_started_at, attempts)
            VALUES (1, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
                window_started_at = excluded.window_started_at,
                attempts = 1
        `).run(now);

        return true;
    }

    if (row.attempts >= 10) {
        return false;
    }

    database.prepare(`
        UPDATE admin_login_limit
        SET attempts = attempts + 1
        WHERE id = 1
    `).run();

    return true;
});

export function allowAdminLoginAttempt(): boolean {
    return checkAndRecordAttempt.immediate();
}