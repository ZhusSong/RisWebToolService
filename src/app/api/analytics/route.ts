import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

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