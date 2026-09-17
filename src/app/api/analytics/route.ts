import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { isAdminAuthenticated } from "../../../lib/admin-auth";

export const runtime = "nodejs";

const dataDirectory = path.join(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "analytics.db"));

database.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        tool_name TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

export async function POST(request: Request) {
    try {
        const body = await request.json();
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

        database
            .prepare(
                "INSERT INTO analytics_events (event_type, tool_name) VALUES (?, ?)"
            )
            .run(eventType, toolName);

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