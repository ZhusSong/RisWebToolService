import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { isAdminAuthenticated } from "../../../lib/admin-auth";
import { requestRetryAfter, readLimitedJson, RequestBodyError } from "../../../lib/request-guard";

import {
    getVisitorIp, initializeVisitorStats, pruneVisitorStats,
    recordVisitorPageView, readVisitorStats,
} from "../../../lib/visitor-analytics";

export const runtime = "nodejs";

const dataDirectory = path.join(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "analytics.db"), { timeout: 5_000 });

database.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        tool_name TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

initializeVisitorStats(database);

export async function POST(request: Request) {
    const retry = requestRetryAfter("analytics", request.headers);
    if (retry) return Response.json({ error: "rateLimited" }, { status: 429, headers: { "Retry-After": String(retry), "Cache-Control": "no-store" } });
    let parsed: unknown;
    try { parsed = await readLimitedJson(request, 4096); }
    catch (error) {
        if (error instanceof RequestBodyError) return Response.json({ error: error.code }, { status: error.status });
        return Response.json({ error: "invalidRequest" }, { status: 400 });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Response.json({ error: "invalidRequest" }, { status: 400 });
    const body = parsed as Record<string, unknown>;
    if (body.toolName !== undefined && body.toolName !== null && (typeof body.toolName !== "string" || body.toolName.length > 128)) return Response.json({ error: "invalidRequest" }, { status: 400 });
    try {
        const eventType =
            body.eventType === "page_view" || body.eventType === "tool_use"
                ? body.eventType
                : null;
        const toolName =
            typeof body.toolName === "string" ? body.toolName : null;

        if (!eventType) {
            return Response.json(
                { error: "无效的事件类型" },
                { status: 400 }
            );
        }

        const ip = eventType === "page_view" ? getVisitorIp(request.headers) : null;
        database.transaction(() => {
            database.prepare(
                "INSERT INTO analytics_events (event_type, tool_name) VALUES (?, ?)"
            ).run(eventType, toolName);
            pruneVisitorStats(database);
            if (ip) recordVisitorPageView(database, ip);
        })();

        return Response.json({ ok: true });
    } catch {
        return Response.json(
            { error: "统计数据保存失败" },
            { status: 500 }
        );
    }
}

export async function GET() {
    const headers = { "Cache-Control": "no-store" };

    try {
        if (!(await isAdminAuthenticated())) {
            return Response.json(
                { error: "请先登录管理员账号。" },
                { status: 401, headers }
            );
        }

        const totals = database.prepare(`
            SELECT
                COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) AS pageViews,
                COUNT(CASE WHEN event_type = 'tool_use' THEN 1 END) AS toolUses
            FROM analytics_events
        `).get() as {
            pageViews: number;
            toolUses: number;
        };

        const dailyToolUses = database.prepare(`
    SELECT
        date(created_at, '+9 hours') AS date,
        COALESCE(NULLIF(tool_name, ''), '未命名工具') AS toolName,
        COUNT(*) AS uses
    FROM analytics_events
    WHERE event_type = 'tool_use'
      AND created_at >= datetime(
          'now', '+9 hours', 'start of day', '-29 days', '-9 hours'
      )
      AND created_at < datetime(
          'now', '+9 hours', 'start of day', '+1 day', '-9 hours'
      )
    GROUP BY date(created_at, '+9 hours'),
             COALESCE(NULLIF(tool_name, ''), '未命名工具')
    ORDER BY date DESC, uses DESC, toolName ASC
`).all() as {
            date: string;
            toolName: string;
            uses: number;
        }[];

        return Response.json(
            {
                ...totals,
                dailyToolUses,
                visitorStats: readVisitorStats(database),
                timeZone: "Asia/Tokyo",
            },
            { headers }
        );
    } catch {
        return Response.json(
            { error: "统计数据读取失败。" },
            { status: 500, headers }
        );
    }
}
